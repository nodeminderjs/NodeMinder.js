// Based on the V4L2 video capture example
// from Video for Linux Two API Specification
// http://linuxtv.org/downloads/v4l-dvb-apis/capture-example.html
//
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <getopt.h>             // getopt_long()

#include <fcntl.h>              // low-level i/o
#include <unistd.h>
#include <errno.h>
#include <time.h>
#include <sys/time.h>           // for gettimeofday()
#include <sys/stat.h>
#include <sys/ioctl.h>

#include <linux/videodev2.h>

#include "encode.h"
#include "change.h"
#include "lib.h"

#define CLEAR(x) memset(&(x), 0, sizeof(x))

struct buffer {
  void   *start;
  size_t  length;
};

static int buffer_gray = 1;
static int buffer_gray_size = 320*240;  // 320 x 240 x 8bits per pixel
static int img_size;
static struct buffer *buffers;
static int flag_first = 1;
static long frame_count = 0;

static char   *dev_name;
static char   *camera;
static int    channel;
static char   *format;
static v4l2_std_id std_id;
static char   *palette;
static uint32_t pixelformat;
static int    width;
static int    height;
static int    fps;

static int    fd = -1;   // device - file descriptor

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

  fd = open(dev_name, O_RDWR /* required */ | O_NONBLOCK, 0);

  if (-1 == fd) {
    fprintf(stderr, "Cannot open '%s': %d, %s\n",
            dev_name, errno, strerror(errno));
    exit(EXIT_FAILURE);
  }
}

static void close_device(void)
{
  if (-1 == close(fd))
    errno_exit("close_device");

  fd = -1;
}

static void init_read()
{
  int size;

  buffers = (struct buffer*) calloc(3, sizeof(*buffers));

  if (!buffers) {
    fprintf(stderr, "Can't allocate buffers. Out of memory\n");
    exit(EXIT_FAILURE);
  }

  buffers[0].length = img_size;
  buffers[0].start = malloc(img_size);

  buffers[1].length = buffer_gray_size;
  buffers[1].start = malloc(buffer_gray_size);
  buffers[2].length = buffer_gray_size;
  buffers[2].start = malloc(buffer_gray_size);
  //init_gray_buffer(&(buffers[1].start), &(buffers[2].start), 320, 240, &size);
  //buffers[1].length = size;
  //buffers[2].length = size;

  if (!buffers[0].start || !buffers[1].start || !buffers[2].start) {
    fprintf(stderr, "Can't allocate buffers [3]. Out of memory\n");
    exit(EXIT_FAILURE);
  }
}

static void init_device(void)
{
  struct v4l2_capability cap;
  struct v4l2_format fmt;

  if (-1 == xioctl(fd, VIDIOC_QUERYCAP, &cap)) {
    if (EINVAL == errno) {
      fprintf(stderr, "%s is no V4L2 device\n", dev_name);
      exit(EXIT_FAILURE);
    } else {
      errno_exit("VIDIOC_QUERYCAP");
    }
  }

  if (!(cap.capabilities & V4L2_CAP_VIDEO_CAPTURE)) {
    fprintf(stderr, "%s is no video capture device\n", dev_name);
    exit(EXIT_FAILURE);
  }

  CLEAR(fmt);
  fmt.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  fmt.fmt.pix.width       = width;
  fmt.fmt.pix.height      = height;
  fmt.fmt.pix.pixelformat = pixelformat;
  //fmt.fmt.pix.field       = V4L2_FIELD_INTERLACED;

  if (-1 == xioctl(fd, VIDIOC_S_FMT, &fmt))
          errno_exit("VIDIOC_S_FMT");
  /* Note VIDIOC_S_FMT may change width and height. */

  /* Buggy driver paranoia. */
  /*
  min = fmt.fmt.pix.width * 2;
  if (fmt.fmt.pix.bytesperline < min)
          fmt.fmt.pix.bytesperline = min;
  min = fmt.fmt.pix.bytesperline * fmt.fmt.pix.height;
  if (fmt.fmt.pix.sizeimage < min)
          fmt.fmt.pix.sizeimage = min;
  */

  img_size = fmt.fmt.pix.sizeimage;
  if (flag_first) {
    flag_first = 0;
    init_read();
    init_encode(buffers[0].start, palette);
  }

  //
  // Select the video input
  // http://linuxtv.org/downloads/v4l-dvb-apis/video.html
  //
  if (-1 == xioctl (fd, VIDIOC_S_INPUT, &channel)) {
    perror ("VIDIOC_S_INPUT");
    exit (EXIT_FAILURE);
  }

  //
  // Selec a new video standard
  //
  struct v4l2_input input;

  memset(&input, 0, sizeof(input));

  input.index = channel;

  if (-1 == xioctl (fd, VIDIOC_ENUMINPUT, &input)) {
    perror ("VIDIOC_ENUM_INPUT");
    exit (EXIT_FAILURE);
  }

  if (0 == (input.std & std_id)) {
    fprintf (stderr, "Format is not supported.\n");
    exit (EXIT_FAILURE);
  }

  if (-1 == ioctl (fd, VIDIOC_S_STD, &std_id)) {
    perror ("VIDIOC_S_STD");
    exit (EXIT_FAILURE);
  }
}

static void process_image(const void *p, int size)
{
  uint8_t *outbuffer1, *outbuffer2;
  int ret;

  char file[80];
  char cmd[80];

  /*
   * Save gray scale image
   */
  if (buffer_gray == 1) {
    outbuffer1 = buffers[1].start;
    outbuffer2 = buffers[2].start;
    buffer_gray = 2;
  } else {
    outbuffer1 = buffers[2].start;
    outbuffer2 = buffers[1].start;
    buffer_gray = 1;
  }
  convert_scale(p, width, height, palette,
                &outbuffer1, 320, 240);

  /*
   * Compare the two gray images to detect change
   */
  if (frame_count > 0) {
    if (strcmp(camera,"05") == 0) {
      ret = detect_change_gray(outbuffer1, outbuffer2, 320, 240, 7, 3);
      fprintf(stderr, "05 - %d\n", ret);
    }
  }
  frame_count++;

  /*
   * Encode the image to jpeg and save to file
   */
  sprintf(file, "/dev/shm/cam%s.jpg", camera);
  encode2jpeg(file);

  /*
   * Send command to node
   */
  if (ret)
    sprintf(cmd, "J%s C", camera);
  else
    sprintf(cmd, "J%s I", camera);
  fprintf(stdout, cmd);

  fflush(stdout);
  //fflush(stderr);
}

static int read_frame(void)
{
  if (-1 == read(fd, buffers[0].start, buffers[0].length)) {
    switch (errno) {
    case EAGAIN:
      return 0;
      //errno_exit("EAGAIN read");

    case EIO:
      /* Could ignore EIO, see spec. */
      /* fall through */

    default:
      errno_exit("read_frame");
    }
  }

  process_image(buffers[0].start, buffers[0].length);
  return 1;
}

static void mainloop(void)
{
  //unsigned int count = frame_count;
  struct timeval t1, t2, tv;
  int r, f = 1000/fps;
  long t;

  while (1) {
    acquire_file_lock(fd, 5);

    // get start time
    gettimeofday(&t1, NULL);

    init_device();

    for (;;) {
      fd_set fds;

      FD_ZERO(&fds);
      FD_SET(fd, &fds);

      /* Timeout. */
      tv.tv_sec = 2;
      tv.tv_usec = 0;

      r = select(fd + 1, &fds, NULL, NULL, &tv);

      if (-1 == r) {
        if (EINTR == errno) {
          continue;
        }
        errno_exit("mainloop: select");
      }

      if (0 == r) {
        fprintf(stderr, "mainloop: select timeout\n");
        exit(EXIT_FAILURE);
      }

      if (read_frame()) {
        break;
      }
      /* EAGAIN - continue select loop. */
    } // for

    release_file_lock(fd);

    // get end time
    gettimeofday(&t2, NULL);

    //fprintf(stderr, "camera: %s, read: %d ms\n", camera, get_elapsed_ms(t1, t2));
    //fflush(stderr);
    t = get_elapsed_ms(t1, t2);
    if (t < f)
      xsleep(0, f - t);
    else
      xsleep(0, f);
  } // while (1)
}

static void usage(FILE *fp, int argc, char **argv)
{
  fprintf(fp,
      "Usage: %s [options]\n\n"
      "Version 0.1\n"
      "Options:\n"
      "-c | --camera        Camera [%s]\n"
      "-d | --device        Device [%s]\n"
      "-i | --input         Input channel [%d]\n"
      "-f | --format        Format [%s]\n"
      "-p | --palette       Palette [%s]\n"
      "-w | --width         Width [%d]\n"
      "-e | --height        Height [%d]\n"
      "-s | --fps           FPS [%d]\n"
      "-h | --help          Print this message\n"
      "",
      argv[0], camera, dev_name, channel, format, palette, width, height, fps);
}

static const char short_options[] = "c:d:i:f:p:w:e:s:h";

static const struct option
long_options[] = {
        { "camera",  required_argument, NULL, 'c' },
        { "device",  required_argument, NULL, 'd' },
        { "input",   required_argument, NULL, 'i' },
        { "format",  required_argument, NULL, 'f' },
        { "palette", required_argument, NULL, 'p' },
        { "width",   required_argument, NULL, 'w' },
        { "height",  required_argument, NULL, 'e' },
        { "fps",     required_argument, NULL, 's' },
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

    case 'c':
      camera = optarg;
      break;

    case 'd':
      dev_name = optarg;
      break;

    case 'i':
      channel = atoi(optarg);
      break;

    case 'f':
      format = optarg;
      if (strcmp(format,"PAL_M") == 0) {
        std_id = V4L2_STD_PAL_M;
      } else {
        std_id = V4L2_STD_NTSC;  // default!
      }
      break;

    case 'p':
      palette = optarg;
      if (strcmp(palette,"BGR32") == 0) {
        pixelformat = V4L2_PIX_FMT_BGR32;
      } else if (strcmp(palette,"RGB24") == 0) {
        pixelformat = V4L2_PIX_FMT_RGB24;
      } else if (strcmp(palette,"RGB32") == 0) {
        pixelformat = V4L2_PIX_FMT_RGB32;
      } else if (strcmp(palette,"YUYV") == 0) {
        pixelformat = V4L2_PIX_FMT_YUYV;
      } else if (strcmp(palette,"YUV420") == 0) {
        pixelformat = V4L2_PIX_FMT_YUV420;
      } else if (strcmp(palette,"GREY") == 0) {
        pixelformat = V4L2_PIX_FMT_GREY;
      } else {
        pixelformat = V4L2_PIX_FMT_BGR24;  // default!
      }
      break;

    case 'w':
      width = atoi(optarg);
      break;

    case 'e':
      height = atoi(optarg);
      break;

    case 's':
      fps = atoi(optarg);
      break;

    case 'h':
      usage(stdout, argc, argv);
      exit(EXIT_SUCCESS);

    default:
      usage(stderr, argc, argv);
      exit(EXIT_FAILURE);
    }
  }

  open_device();

  mainloop();

  uninit_encode();
  close_device();

  //fprintf(stderr, "\n");
  return 0;
}
