/*
 * Based on the V4L2 video capture example from Video for Linux Two API Specification
 * http://linuxtv.org/downloads/v4l-dvb-apis/capture-example.html
 */
#include <stdio.h>
#include <stdlib.h>
#include <getopt.h>           // getopt_long()
#include <fcntl.h>            // low-level i/o
#include <errno.h>
#include <sys/stat.h>
#include <sys/mman.h>

#include <linux/videodev2.h>

#define CLEAR(x) memset(&(x), 0, sizeof(x))

#define N_BUFFERS 4               // buffers for each camera/input

struct camera {
  char  camera[31];
  int   input;
  void *buffer[N_BUFFERS];
  int   buf_num;
};
static struct camera cameras[8];  // Max of 8 cameras/inputs per device
static int    n_cameras;
static int    imagesize;

static char  *device;
static char  *inputs;    // inputs cam_id:input pairs - ex.: 01:0,05:1,09:2,13:3
static char  *temp;      // temp dir to save files
static int    fd = -1;   // device - file descriptor

static void errno_exit(const char *s);
static int  xioctl(int fh, int request, void *arg);
static void set_input_standard(cam);
static void open_device(void);
static void close_device(void);
static void init_read(void);
static void uninit_read(void);
static void init_device(void);
static void read_frame(int cam);
static void mainloop(void);
static void usage(FILE *fp, int argc, char **argv);
int         main(int argc, char *argv[]);

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

  // select the video input
  if (-1 == xioctl (fd, VIDIOC_S_INPUT, &channel)) {
    perror ("VIDIOC_S_INPUT");
    exit (EXIT_FAILURE);
  }

  // select a new video standard - V4L2_STD_NTSC
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

static void init_read(void)
{
  int i, j, c, f;

  // parse inputs string and initialize cameras array
  // ex.: inputs="01:0,05:1,09:2,13:3"
  n_cameras = 0;
  i = 0;
  c = 0;
  while (i < strlen(inputs)) {
    if (inputs[i] == ',')
      i++;
    j = 0;
    while (inputs[i] != ':')
      cameras[c].camera[j++] = inputs[i++];
    cameras[c].camera[j] = 0;
    cameras[c].input = inputs[++i] - '0';
    i++;
    c++;
    n_cameras++;
  }

  // initialize buffers (memory mapped files)
  char filename[80];
  for (i=0; i<n_cameras; i++) {
    for (j=0; j<N_BUFFERS; j++) {
      sprintf(filename, "%s%s-%d.raw", temp, cameras[i].camera, j+1);
      f = open(filename, O_RDWR|O_CREAT, 0644);
      ftruncate(f, imagesize);
      cameras[i].buffer[j] =
          mmap(NULL,                   /* start anywhere */
               imagesize,
               PROT_READ | PROT_WRITE, /* required */
               MAP_SHARED,             /* recommended */
               f, 0);
      if (MAP_FAILED == cameras[i].buffer[j]) {
        perror("mmap");
        exit (EXIT_FAILURE);
      }
      close(f);
    }
  }
}

static void uninit_read(void)
{
  unsigned int i, j;

  for (i = 0; i < n_cameras; i++)
    for (j = 0; j < N_BUFFERS; j++)
      if (-1 == munmap(cameras[i].buffer[j], imagesize))
        errno_exit("munmap");
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

  if (!(cap.capabilities & V4L2_CAP_READWRITE)) {
    fprintf(stderr, "%s does not support read/write i/o\n",
        device);
    exit(EXIT_FAILURE);
  }

  CLEAR(fmt);
  fmt.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  if (1) {                                     // ToDo: init config values here!
    fmt.fmt.pix.width       = 320;
    fmt.fmt.pix.height      = 240;
    fmt.fmt.pix.pixelformat = V4L2_PIX_FMT_BGR24;

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

  imagesize = fmt.fmt.pix.sizeimage;

  /* Select video input, video standard and tune here. */
}

static void read_frame(int cam)
{
  while (1) {
    if (-1 == read(fd, cameras[cam].buffer[cameras[cam].buf_num], imagesize)) {
      switch (errno) {
      case EAGAIN:
        //errno_exit("EAGAIN read");
        continue;

      case EIO:
        /* Could ignore EIO, see spec. */
        /* fall through */
        break;

      default:
        errno_exit("read_frame");
      }
    }
    else
      break;
  }

  char cmd[80];
  char *cam_id = cameras[cam].camera;

  /*
   * Send command and status to node
   */
  sprintf(cmd, "F,%s,%s-%d.raw,320,240", cam_id, cam_id, cameras[cam].buf_num + 1);
  fprintf(stdout, cmd);
  fflush(stdout);

  cameras[cam].buf_num = ++(cameras[cam].buf_num) % N_BUFFERS;
}

static void mainloop(void)
{
  int i;

  while (1) {
    for (i=0; i<n_cameras; i++) {
      set_input_standard(i);  // select the next video input
      read_frame(i);
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

  open_device();
  init_device();
  init_read();

  mainloop();

  uninit_read();
  close_device();

  return 0;
}
