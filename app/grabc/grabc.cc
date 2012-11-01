// Based on the V4L2 video capture example
// from Video for Linux Two API Specification
// http://linuxtv.org/downloads/v4l-dvb-apis/capture-example.html
//
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <getopt.h>             /* getopt_long() */

#include <fcntl.h>              /* low-level i/o */
#include <unistd.h>
#include <errno.h>
#include <sys/stat.h>
#include <sys/ioctl.h>

#include <linux/videodev2.h>

#define CLEAR(x) memset(&(x), 0, sizeof(x))

struct buffer {
  void   *start;
  size_t  length;
};

static char   *dev_name;
static int     fd = -1;
struct buffer *buffers;
static int     frame_count = 1;

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
    errno_exit("close");

  fd = -1;
}

static void init_read(unsigned int buffer_size)
{
  buffers = (buffer*) calloc(1, sizeof(*buffers));

  if (!buffers) {
    fprintf(stderr, "Out of memory\n");
    exit(EXIT_FAILURE);
  }

  buffers[0].length = buffer_size;
  buffers[0].start = malloc(buffer_size);

  if (!buffers[0].start) {
    fprintf(stderr, "Out of memory\n");
    exit(EXIT_FAILURE);
  }
}

static void uninit_device(void)
{
  free(buffers[0].start);
  free(buffers);
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
  fmt.fmt.pix.width       = 320;
  fmt.fmt.pix.height      = 240;
  //fmt.fmt.pix.pixelformat = V4L2_PIX_FMT_YUYV;
  fmt.fmt.pix.pixelformat = V4L2_PIX_FMT_BGR24;
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

  init_read(fmt.fmt.pix.sizeimage);

  //
  // Select the video input
  // http://linuxtv.org/downloads/v4l-dvb-apis/video.html
  //

  //
  // Selecting a new video standard
  //
  struct v4l2_input input;
  v4l2_std_id std_id;

  memset (&input, 0, sizeof (input));

  if (-1 == ioctl (fd, VIDIOC_G_INPUT, &input.index)) {
    perror ("VIDIOC_G_INPUT");
    exit (EXIT_FAILURE);
  }

  if (-1 == ioctl (fd, VIDIOC_ENUMINPUT, &input)) {
    perror ("VIDIOC_ENUM_INPUT");
    exit (EXIT_FAILURE);
  }

  if (0 == (input.std & V4L2_STD_NTSC)) {
    fprintf (stderr, "NTSC is not supported.\n");
    exit (EXIT_FAILURE);
  }

  /* Note this is also supposed to work when only B or G/PAL is supported. */

  std_id = V4L2_STD_NTSC;

  if (-1 == ioctl (fd, VIDIOC_S_STD, &std_id)) {
    perror ("VIDIOC_S_STD");
    exit (EXIT_FAILURE);
  }

}

static void process_image(const void *p, int size)
{
  fwrite(p, size, 1, stdout);

  fflush(stderr);
  //fprintf(stderr, ".");
  fflush(stdout);
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
      errno_exit("read");
    }
  }

  process_image(buffers[0].start, buffers[0].length);

  return 1;
}

static void mainloop(void)
{
  unsigned int count;
  count = frame_count;

  while (count-- > 0) {
    for (;;) {
      fd_set fds;
      struct timeval tv;
      int r;

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
        errno_exit("select");
      }

      if (0 == r) {
        fprintf(stderr, "select timeout\n");
        exit(EXIT_FAILURE);
      }

      if (read_frame()) {
        break;
      }

      /* EAGAIN - continue select loop. */
    }
  }
}

static void usage(FILE *fp, int argc, char **argv)
{
  fprintf(fp,
      "Usage: %s [options]\n\n"
      "Version 0.1\n"
      "Options:\n"
      "-d | --device name   Video device name [%s]\n"
      "-h | --help          Print this message\n"
      "",
      argv[0], dev_name);
}

static const char short_options[] = "d:h";

static const struct option
long_options[] = {
        { "device", required_argument, NULL, 'd' },
        { "help",   no_argument,       NULL, 'h' },
        { 0, 0, 0, 0 }
};

int main(int argc, char *argv[])
{
  dev_name = "/dev/video0";

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

  open_device();
  init_device();
  //start_capturing();
  mainloop();
  //stop_capturing();
  uninit_device();
  close_device();

  //fprintf(stderr, "\n");
  return 0;
}
