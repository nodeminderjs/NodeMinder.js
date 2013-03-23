/*
 * Based on the V4L2 video capture example from Video for Linux Two API Specification
 * http://linuxtv.org/downloads/v4l-dvb-apis/capture-example.html
 *
 * main()
 *   open_device()       // open
 *   init_device()       // VIDIOC_QUERYCAP, VIDIOC_S_FMT, init_mmap
 *   start_capturing()   // VIDIOC_QBUF, VIDIOC_STREAMON
 *   mainloop()          // set_input_standard, read_frame
 *   stop_capturing()    // VIDIOC_STREAMOFF
 *   uninit_device()
 *   close_device()
 *
 * read_frame()          // VIDIOC_DQBUF, process_image, VIDIOC_QBUF
 * process_image()       // convert_scale, detect_change_gray
 */
#include <stdio.h>
#include <stdint.h>
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

#define CLEAR(x) memset(&(x), 0, sizeof(x))

struct buffer {
  void    *start;
  size_t   length;
};

static struct buffer *buffers;
static unsigned int   n_buffers;

struct camera {
  char     camera[41];
  int      input;
  int      buf_num;
};
static struct camera cameras[8];      // Max of 8 cameras/inputs per device
static int    n_cameras;

static int    captures_per_frame = 2;
static int    req_buffers_count  = 4; // buffers by camera

static char  *device;
static char  *inputs;    // inputs cam_id:input pairs - ex.: 01:0,05:1,09:2,13:3
static char  *temp;      // temp dir to save files
static int    fd = -1;   // device - file descriptor

static void errno_exit(const char *s)
{
  fprintf(stderr, "%s error %d, %s\n", s, errno, strerror(errno));
  exit(EXIT_FAILURE);
}

static int xioctl(int fh, int request, void *arg)
{
  int r;

  do {
    r = ioctl(fh, request, arg);
  } while (-1 == r && EINTR == errno);

  return r;
}

static void set_input_standard(cam)
{
  int channel = cameras[cam].input;
  v4l2_std_id std_id = V4L2_STD_NTSC;

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

  if (-1 == stat(device, &st)) {
    fprintf(stderr, "Cannot identify '%s': %d, %s\n",
        device, errno, strerror(errno));
    exit(EXIT_FAILURE);
  }

  if (!S_ISCHR(st.st_mode)) {
    fprintf(stderr, "%s is no device\n", device);
    exit(EXIT_FAILURE);
  }

  fd = open(device, O_RDWR /* required */, 0);

  if (-1 == fd) {
    fprintf(stderr, "Cannot open '%s': %d, %s\n",
        device, errno, strerror(errno));
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
      fprintf(stderr, "%s does not support memory mapping\n", device);
      exit(EXIT_FAILURE);
    } else {
      errno_exit("VIDIOC_REQBUFS");
    }
  }

  if (req.count < 1) {
    fprintf(stderr, "Insufficient buffer memory on %s\n", device);
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

    buf.type   = V4L2_BUF_TYPE_VIDEO_CAPTURE;
    buf.memory = V4L2_MEMORY_MMAP;
    buf.index  = n_buffers;

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
          device);
      exit(EXIT_FAILURE);
    } else {
      errno_exit("VIDIOC_QUERYCAP");
    }
  }

  if (!(cap.capabilities & V4L2_CAP_VIDEO_CAPTURE)) {
    fprintf(stderr, "%s is no video capture device\n",
        device);
    exit(EXIT_FAILURE);
  }

  if (!(cap.capabilities & V4L2_CAP_STREAMING)) {
    fprintf(stderr, "%s does not support streaming i/o\n",
        device);
    exit(EXIT_FAILURE);
  }

  CLEAR(fmt);

  fmt.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  if (1) {                                     // ToDo: init config values here!
    fmt.fmt.pix.width       = 320;
    fmt.fmt.pix.height      = 240;
    fmt.fmt.pix.pixelformat = V4L2_PIX_FMT_BGR24;
    //fmt.fmt.pix.field     = V4L2_FIELD_INTERLACED;

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
  int i, ret = 0;

  char file[80];
  char cmd[80];

  /*
   * Save jpeg file
   */
  //sprintf(file, "/dev/shm/%s-%d.jpg", cameras[n].camera, cameras[n].jpg_num + 1);

  /*
   * Send command and status to node
   */
  if (ret)
    sprintf(cmd, "J%s-%d C", cameras[n].camera, cameras[n].buf_num + 1);
  else
    sprintf(cmd, "J%s-%d I", cameras[n].camera, cameras[n].buf_num + 1);
  fprintf(stdout, cmd);
  fflush(stdout);
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

// $ ./nmjs-gv-800 -d /dev/video0 -i 01:0,05:1,09:2,13:3 -t /dev/shm/

static void usage(FILE *fp, int argc, char **argv)
{
  fprintf(fp,
      "Usage: %s [options]\n\n"
      "Version 0.3\n"
      "Options:\n"
      "-d | --device        Device [%s]\n"
      "-i | --inputs        Inputs [%s]\n"
      "-t | --temp          Temp dir [%s]\n"
      "-h | --help          Print this message\n"
      "",
      argv[0], device, inputs);
}

static const char short_options[] = "d:i:t:h";

static const struct option
long_options[] = {
      { "device",  required_argument, NULL, 'd' },
      { "inputs",  required_argument, NULL, 'i' },
      { "temp",    required_argument, NULL, 't' },
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
      device = optarg;
      break;

    case 'i':
      inputs = optarg;
      break;

    case 't':
      temp = optarg;
      break;

    case 'h':
      usage(stdout, argc, argv);
      exit(EXIT_SUCCESS);

    default:
      usage(stderr, argc, argv);
      exit(EXIT_FAILURE);
    }
  }

  // ex.: inputs="01:0,05:1,09:2,13:3"
  n_cameras = 0;
  int i = 0;
  int c = 0;
  while (i < strlen(inputs)) {
    if (inputs[i] == ',')
      i++;
    int j = 0;
    while (inputs[i] != ':')
      cameras[c].camera[j++] = inputs[i++];
    cameras[c].camera[j] = 0;
    cameras[c].input = inputs[++i] - '0';
    i++;
    c++;
    n_cameras++;
  }

  open_device();
  init_device();
  start_capturing();

  mainloop();

  stop_capturing();
  uninit_device();
  close_device();

  return 0;
}
