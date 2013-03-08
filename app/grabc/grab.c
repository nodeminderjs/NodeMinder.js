/*
 * Based on the V4L2 video capture example from Video for Linux Two API Specification
 * http://linuxtv.org/downloads/v4l-dvb-apis/capture-example.html
 *
 * main()
 *   read_config_file()
 *   open_device()       // open
 *   init_device()       // VIDIOC_QUERYCAP, VIDIOC_S_FMT, init_mmap, register_encode
 *   start_capturing()   // VIDIOC_QBUF, VIDIOC_STREAMON
 *   mainloop()          // set_input_standard, read_frame
 *   stop_capturing()    // VIDIOC_STREAMOFF
 *   uninit_encode()
 *   close_device()
 *
 * read_frame()          // VIDIOC_DQBUF, process_image, VIDIOC_QBUF
 * process_image()       // convert_scale, detect_change_gray, encode2jpeg
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

#include <getopt.h>           // getopt_long()

#include <fcntl.h>            // low-level i/o
#include <unistd.h>
#include <errno.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/time.h>         // for gettimeofday()
#include <sys/mman.h>
#include <sys/ioctl.h>

#include <time.h>

#include <linux/videodev2.h>

#include "encode.h"
#include "change.h"
#include "lib.h"

#define CLEAR(x) memset(&(x), 0, sizeof(x))

struct buffer {
  void    *start;
  size_t   length;
};

static struct buffer *buffers;
static unsigned int   n_buffers;

struct camera {
  char     camera[3];
  char    *descr;
  int      input;
  char    *format;
  v4l2_std_id standard;
  char    *palette;
  uint32_t pixelformat;
  int      width;
  int      height;
  int      fps;
  int      pixel_limit;
  int      image_limit;
  struct buffer gbuffers[2];
  int      buffer_gray;
  long     frame_count;
  int      jpg_num;
};

static struct camera cameras[8];      // Max of 8 cameras/inputs per device
static int    n_cameras;

static int    captures_per_frame = 2;
static int    req_buffers_count  = 4;

static char  *dev_name;
static int    fd = -1;   // device - file descriptor

static v4l2_std_id str_to_std(char *format)
{
  if (strcmp(format,"PAL_M") == 0)
    return V4L2_STD_PAL_M;
  else
    return V4L2_STD_NTSC;  // default
}

static uint32_t str_to_pixelformat(char *palette)
{
if (strcmp(palette,"BGR32") == 0)
  return V4L2_PIX_FMT_BGR32;
else if (strcmp(palette,"RGB24") == 0)
  return V4L2_PIX_FMT_RGB24;
else if (strcmp(palette,"RGB32") == 0)
  return V4L2_PIX_FMT_RGB32;
else if (strcmp(palette,"YUYV") == 0)
  return V4L2_PIX_FMT_YUYV;
else if (strcmp(palette,"YUV420") == 0)
  return V4L2_PIX_FMT_YUV420;
else if (strcmp(palette,"GREY") == 0)
  return V4L2_PIX_FMT_GREY;
else
  return V4L2_PIX_FMT_BGR24;  // default
}

static int get_field(char str[200], int i, char fld[200])
{
  int j = 0;
  while (str[i] == '|')
    i++;
  while (str[i] != '|') {
    fld[j] = str[i];
    i++;
    j++;
  }
  fld[j] = 0;
  return i;
}

void read_config_file(char *file)
{
  /*
   * cam,device,channel,descr,type,format,palette,width,height,fps,rec_on,pixel_limit,image_limit
   * |01|/dev/video0|0|descr|local|NTSC|BGR24|320|240|3|1|6|2|
   * ...
   * |devices|2|8|
   */
  char str[300], fld[200];
  char cam[3];
  int  i, n = 0;
  FILE *f;

  f = fopen(file, "r");
  if (!f) {
    fprintf(stderr, "grab.c: Cannot read config file: %s\n", file);
    exit(EXIT_FAILURE);
  }

  while( fgets(str, sizeof(str), f) != NULL) {
    i = 0;
    i = get_field(str, i, fld);  // field 1 - camera number ('00'..'99'), 'devices' or 'server'

    if (fld[0] >= '0' && fld[0] <= '9') {
      /*
       * Process camera configuration
       */
      strcpy(cam, fld);

      i = get_field(str, i, fld);           // device

      if (strcmp(fld, dev_name) == 0) {
        /*
         * Same device - process camera configuration
         */
        strcpy( cameras[n].camera, cam);

        i = get_field(str, i, fld);         // channel
        cameras[n].input = atoi(fld);

        i = get_field(str, i, fld);         // descr
        cameras[n].descr = malloc(strlen(fld));
        strcpy(cameras[n].descr, fld);

        i = get_field(str, i, fld);         // type

        i = get_field(str, i, fld);         // format
        cameras[n].format = malloc(strlen(fld));
        strcpy(cameras[n].format, fld);
        cameras[n].standard = str_to_std(fld);

        i = get_field(str, i, fld);         // palette
        cameras[n].palette = malloc(strlen(fld));
        strcpy(cameras[n].palette, fld);
        cameras[n].pixelformat = str_to_pixelformat(fld);

        i = get_field(str, i, fld);         // width
        cameras[n].width = atoi(fld);

        i = get_field(str, i, fld);         // height
        cameras[n].height = atoi(fld);

        i = get_field(str, i, fld);         // fps
        cameras[n].fps = atoi(fld);

        i = get_field(str, i, fld);         // rec_on

        i = get_field(str, i, fld);         // pixel_limit
        cameras[n].pixel_limit = atoi(fld);

        i = get_field(str, i, fld);         // image_limit
        cameras[n].image_limit = atoi(fld);

        if (cameras[n].pixel_limit >= 0) {
          cameras[n].gbuffers[0].length = cameras[n].width * cameras[n].height;   // 320 x 240 x 8bits per pixel
          cameras[n].gbuffers[1].length = cameras[n].gbuffers[0].length;

          cameras[n].gbuffers[0].start = malloc(cameras[n].gbuffers[0].length);
          cameras[n].gbuffers[1].start = malloc(cameras[n].gbuffers[1].length);

          if (!cameras[n].gbuffers[0].start || !cameras[n].gbuffers[1].start) {
            fprintf(stderr, "Can't allocate gbuffers [2]. Out of memory\n");
            exit(EXIT_FAILURE);
          }
        }

        cameras[n].buffer_gray = 0;
        cameras[n].frame_count = 0;
        cameras[n].jpg_num = 0;

        n++;
      }
    }
    else if (strcmp(fld, "devices") == 0) {
      /*
       * Process devices configuration
       */
      i = get_field(str, i, fld);         // captures_per_frame
      captures_per_frame = atoi(fld);

      i = get_field(str, i, fld);         // req_buffers_count
      req_buffers_count = atoi(fld);
    }
  } // while

  n_cameras = n;

  /*
  fprintf(stderr, "\ndevice=%s\n", dev_name);
  fprintf(stderr, "n_cameras = %d\n", n_cameras);
  for (i=0; i<n_cameras; i++) {
    fprintf(stderr, "i=%d => ", i);
    fprintf(stderr, "|%s|%s|%d|%s|%d|%s|%d|%d|%d|%d|%d|%d|\n", cameras[i].camera, cameras[i].descr,
        cameras[i].input, cameras[i].format, cameras[i].standard,
        cameras[i].palette, cameras[i].pixelformat, cameras[i].width, cameras[i].height,
        cameras[i].fps, cameras[i].pixel_limit, cameras[i].image_limit);
  }
  */
}

static void set_input_standard(cam)
{
  int channel = cameras[cam].input;
  v4l2_std_id std_id = cameras[cam].standard;

  /*
   * Select the video input
   */
  if (-1 == xioctl (fd, VIDIOC_S_INPUT, &channel)) {
    perror ("VIDIOC_S_INPUT");
    exit (EXIT_FAILURE);
  }

  /*
   * Select a new video standard - V4L2_STD_NTSC
   */
  if (-1 == ioctl (fd, VIDIOC_S_STD, &std_id)) {
    perror ("VIDIOC_S_STD");
    exit (EXIT_FAILURE);
  }
}

static void open_device(void)
{
  struct stat st;

  if (-1 == stat(dev_name, &st)) {
    fprintf(stderr, "Cannot identify '%s': %d, %s\n",
        dev_name, errno, strerror(errno));
    exit(EXIT_FAILURE);
  }

  if (!S_ISCHR(st.st_mode)) {
    fprintf(stderr, "%s is no device\n", dev_name);
    exit(EXIT_FAILURE);
  }

  fd = open(dev_name, O_RDWR /* required */, 0);

  if (-1 == fd) {
    fprintf(stderr, "Cannot open '%s': %d, %s\n",
        dev_name, errno, strerror(errno));
    exit(EXIT_FAILURE);
  }
}

static void close_device(void)
{
  if (-1 == close(fd))
    errno_exit("close");

  fd = -1;
}

static void init_mmap(void)
{
  struct v4l2_requestbuffers req;

  CLEAR(req);

  req.count = req_buffers_count * n_cameras;
  req.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  req.memory = V4L2_MEMORY_MMAP;

  if (-1 == xioctl(fd, VIDIOC_REQBUFS, &req)) {
    if (EINVAL == errno) {
      fprintf(stderr, "%s does not support "
          "memory mapping\n", dev_name);
      exit(EXIT_FAILURE);
    } else {
      errno_exit("VIDIOC_REQBUFS");
    }
  }

  if (req.count < 1) {
    fprintf(stderr, "Insufficient buffer memory on %s\n", dev_name);
    exit(EXIT_FAILURE);
  }

  buffers = calloc(req.count, sizeof(*buffers));

  if (!buffers) {
    fprintf(stderr, "Out of memory\n");
    exit(EXIT_FAILURE);
  }

  for (n_buffers = 0; n_buffers < req.count; ++n_buffers) {
    struct v4l2_buffer buf;

    CLEAR(buf);

    buf.type        = V4L2_BUF_TYPE_VIDEO_CAPTURE;
    buf.memory      = V4L2_MEMORY_MMAP;
    buf.index       = n_buffers;

    if (-1 == xioctl(fd, VIDIOC_QUERYBUF, &buf))
      errno_exit("VIDIOC_QUERYBUF");

    buffers[n_buffers].length = buf.length;
    buffers[n_buffers].start =
        mmap(NULL /* start anywhere */,
            buf.length,
            PROT_READ | PROT_WRITE /* required */,
            MAP_SHARED /* recommended */,
            fd, buf.m.offset);

    if (MAP_FAILED == buffers[n_buffers].start)
      errno_exit("mmap");
  }
}

static void init_device(void)
{
  struct v4l2_capability cap;
  struct v4l2_format fmt;
  unsigned int min;

  if (-1 == xioctl(fd, VIDIOC_QUERYCAP, &cap)) {
    if (EINVAL == errno) {
      fprintf(stderr, "%s is no V4L2 device\n",
          dev_name);
      exit(EXIT_FAILURE);
    } else {
      errno_exit("VIDIOC_QUERYCAP");
    }
  }

  if (!(cap.capabilities & V4L2_CAP_VIDEO_CAPTURE)) {
    fprintf(stderr, "%s is no video capture device\n",
        dev_name);
    exit(EXIT_FAILURE);
  }

  if (!(cap.capabilities & V4L2_CAP_STREAMING)) {
    fprintf(stderr, "%s does not support streaming i/o\n",
        dev_name);
    exit(EXIT_FAILURE);
  }

  CLEAR(fmt);

  fmt.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  //if (force_format) {
  if (1) {                                     // ToDo: init config values here!
    fmt.fmt.pix.width       = 320;
    fmt.fmt.pix.height      = 240;
    //fmt.fmt.pix.pixelformat = V4L2_PIX_FMT_YUYV;
    fmt.fmt.pix.pixelformat = cameras[0].pixelformat;
    //fmt.fmt.pix.field       = V4L2_FIELD_INTERLACED;

    if (-1 == xioctl(fd, VIDIOC_S_FMT, &fmt))
      errno_exit("VIDIOC_S_FMT");

    /* Note VIDIOC_S_FMT may change width and height. */
  } else {
    /* Preserve original settings as set by v4l2-ctl for example */
    if (-1 == xioctl(fd, VIDIOC_G_FMT, &fmt))  // ToDo: set default values here - realocate buffers
      errno_exit("VIDIOC_G_FMT");
  }

  /* Buggy driver paranoia. */
  min = fmt.fmt.pix.width * 2;
  if (fmt.fmt.pix.bytesperline < min)
    fmt.fmt.pix.bytesperline = min;
  min = fmt.fmt.pix.bytesperline * fmt.fmt.pix.height;
  if (fmt.fmt.pix.sizeimage < min)
    fmt.fmt.pix.sizeimage = min;

  init_mmap();  // initialize buffers!

  /* Select video input, video standard and tune here. */

  init_encode(V4L2_PIX_FMT_BGR24, 320, 240, 320, 240);  // ToDo: untie from 320x240 res
}

static void uninit_device(void)
{
  unsigned int i;

  for (i = 0; i < n_buffers; ++i)
    if (-1 == munmap(buffers[i].start, buffers[i].length))
      errno_exit("munmap");

  free(buffers);
}

static void start_capturing(void)
{
  unsigned int i;
  enum v4l2_buf_type type;

  for (i = 0; i < n_buffers; ++i) {
    struct v4l2_buffer buf;

    CLEAR(buf);
    buf.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
    buf.memory = V4L2_MEMORY_MMAP;
    buf.index = i;

    if (-1 == xioctl(fd, VIDIOC_QBUF, &buf)) {
      if (errno == EBUSY)
        break;
      errno_exit("VIDIOC_QBUF (start_capturing)");
    }
  }

  type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  if (-1 == xioctl(fd, VIDIOC_STREAMON, &type))
    errno_exit("VIDIOC_STREAMON");
}

static void stop_capturing(void)
{
  enum v4l2_buf_type type;

  type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  if (-1 == xioctl(fd, VIDIOC_STREAMOFF, &type))
    errno_exit("VIDIOC_STREAMOFF");
}

static void process_image(const void *p, int size, int n)
{
  uint8_t *outbuffer1, *outbuffer2;
  int i, ret = 0;

  char file[80];
  char cmd[80];

  if (cameras[n].pixel_limit > -1) {
    /*
     * Save gray scale image
     */
    i = (cameras[n].buffer_gray + 1) % 2;
    outbuffer1 = cameras[n].gbuffers[cameras[n].buffer_gray].start;
    outbuffer2 = cameras[n].gbuffers[i].start;
    cameras[n].buffer_gray = i;

    convert_scale(p,           cameras[n].width, cameras[n].height, cameras[n].palette,
                  &outbuffer1, cameras[n].width, cameras[n].height);

    /*
     * Compare two gray images to detect change
     */
    if (cameras[n].frame_count > 0) {
      ret = detect_change_gray(outbuffer1, outbuffer2, cameras[n].width, cameras[n].height,
                               cameras[n].pixel_limit, cameras[n].image_limit);
    }
    cameras[n].frame_count++;
  }

  /*
   * Save jpeg file
   */
  sprintf(file, "/dev/shm/%s-%d.jpg", cameras[n].camera, cameras[n].jpg_num + 1);
  encode2jpeg(p, file);

  /*
   * Send command and status to node
   */
  if (ret)
    sprintf(cmd, "J%s-%d C", cameras[n].camera, cameras[n].jpg_num + 1);
  else
    sprintf(cmd, "J%s-%d I", cameras[n].camera, cameras[n].jpg_num + 1);
  fprintf(stdout, cmd);
  fflush(stdout);

  cameras[n].jpg_num = (cameras[n].jpg_num + 1) % 3;  // ToDo: put this (3) in a constant
}

static int read_frame(int input_frame)
{
  struct v4l2_buffer buf;
  unsigned int i;

  CLEAR(buf);

  buf.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  buf.memory = V4L2_MEMORY_MMAP;

  for (i=0; i<captures_per_frame; i++) {
    if (-1 == xioctl(fd, VIDIOC_DQBUF, &buf)) {
      switch (errno) {
      case EAGAIN:
        return 0;

      case EIO:
        /* Could ignore EIO, see spec. */

        /* fall through */

      default:
        errno_exit("VIDIOC_DQBUF");
      }
    }
    if (i < captures_per_frame - 1) {
      if (-1 == xioctl(fd, VIDIOC_QBUF, &buf))
        errno_exit("VIDIOC_QBUF (read_frame)");
    }
  }

  assert(buf.index < n_buffers);

  process_image(buffers[buf.index].start, buf.bytesused, input_frame);

  if (-1 == xioctl(fd, VIDIOC_QBUF, &buf))
    errno_exit("VIDIOC_QBUF (read_frame)");

  return 1;
}

static void mainloop(void)
{
  int i;

  while (1) {
    for (i=0; i<n_cameras; ) {
      read_frame(i);
      set_input_standard((++i)%n_cameras);  // select the next video input
    }
  }
}

static void usage(FILE *fp, int argc, char **argv)
{
  fprintf(fp,
      "Usage: %s [options]\n\n"
      "Version 0.2\n"
      "Options:\n"
      "-d | --device        Device [%s]\n"
      "-h | --help          Print this message\n"
      "",
      argv[0], dev_name);
}

static const char short_options[] = "d:h";

static const struct option
long_options[] = {
      { "device",  required_argument, NULL, 'd' },
      { "help",    no_argument,       NULL, 'h' },
      { 0, 0, 0, 0 }
};

int main(int argc, char *argv[])
{
  for (;;) {
    int idx;
    int c;

    c = getopt_long(argc, argv, short_options, long_options, &idx);

    if (-1 == c)
      break;

    switch (c) {
    case 0: /* getopt_long() flag */
        break;

    case 'd':
      dev_name = optarg;
      break;

    case 'h':
      usage(stdout, argc, argv);
      exit(EXIT_SUCCESS);

    default:
      usage(stderr, argc, argv);
      exit(EXIT_FAILURE);
    }
  }

  read_config_file("/tmp/nodeminderjs_grabc.conf");

  open_device();
  init_device();
  start_capturing();

  mainloop();

  stop_capturing();
  uninit_device();
  uninit_encode();
  close_device();

  return 0;
}
