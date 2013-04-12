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

#define MAX_INPUTS 4              // Max of 4 inputs per device
#define N_BUFFERS_INPUT 4         // buffers for each camera/input

void *buffer[N_BUFFERS_INPUT * MAX_INPUTS];

struct camera {
  char  camera[31];
  int   input;
};

static struct camera cameras[MAX_INPUTS];  // Max of 4 cameras/inputs per device
static int    n_cameras;
static int    n_buffers;
static int    imagesize;

static char  *device;
static char  *inputs;    // inputs cam_id:input pairs - ex.: 01:0,05:1,09:2,13:3
static char  *temp;      // temp dir to save files
static int    fd = -1;   // device - file descriptor

v4l2_std_id std_id = V4L2_STD_NTSC;

static void errno_exit(const char *s);
static int  xioctl(int fh, int request, void *arg);
static void set_input_standard(input);
static void open_device(void);
static void close_device(void);
static void init_device(void);
static void init_streaming(void);
static void uninit_streaming(void);
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

static void set_input_standard(input)
{
  // select the video input
  if (-1 == xioctl (fd, VIDIOC_S_INPUT, &input)) {
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
    fprintf(stderr, "%s does not support streaming i/o\n", device);
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

static void init_streaming(void)
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

  set_input_standard(cameras[0].input);

  n_buffers = n_cameras * N_BUFFERS_INPUT;

  // init userp streaming
  struct v4l2_requestbuffers req;
  CLEAR(req);

  req.count  = n_buffers;
  req.type   = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  req.memory = V4L2_MEMORY_USERPTR;

  if (-1 == xioctl(fd, VIDIOC_REQBUFS, &req)) {
    if (EINVAL == errno) {
      fprintf(stderr, "%s does not support user pointer streaming i/o\n", device);
      exit(EXIT_FAILURE);
    } else {
      errno_exit("VIDIOC_REQBUFS");
    }
  }

  // initialize buffers (memory mapped files)
  char filename[80];
  for (i=0; i<n_buffers; i++) {
    sprintf(filename, "%s%02d.raw", temp, i+1);
    f = open(filename, O_RDWR|O_CREAT, 0644);
    ftruncate(f, imagesize);
    buffer[i] =
        mmap(NULL,                   /* start anywhere */
             imagesize,
             PROT_READ | PROT_WRITE, /* required */
             MAP_SHARED,             /* recommended */
             f, 0);
    if (MAP_FAILED == buffer[i]) {
      perror("mmap");
      exit (EXIT_FAILURE);
    }
    close(f);
  }

  // queue buffers and start capturing
  struct v4l2_buffer buf;

  for (i=0; i<n_buffers; i++) {
    CLEAR(buf);
    buf.index = i;
    buf.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
    buf.memory = V4L2_MEMORY_USERPTR;
    buf.m.userptr = (unsigned long)buffer[i];
    buf.length = imagesize;
    //buf.input = i/2;

    if (-1 == xioctl(fd, VIDIOC_QBUF, &buf))
      errno_exit("VIDIOC_QBUF");
  }

  enum v4l2_buf_type type;
  type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  if (-1 == xioctl(fd, VIDIOC_STREAMON, &type))
    errno_exit("VIDIOC_STREAMON");
}

static void uninit_streaming(void)
{
  unsigned int i;

  for (i=0; i<n_buffers; i++)
    if (-1 == munmap(buffer[i], imagesize))
      errno_exit("munmap");
}

static void read_frame(int cam)
{
  //int i;
  struct v4l2_buffer buf;

  CLEAR(buf);
  buf.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  buf.memory = V4L2_MEMORY_USERPTR;

  while (1)
    if (xioctl(fd, VIDIOC_DQBUF, &buf) > -1)
      break;
  // requeue the buffer
  if (-1 == xioctl(fd, VIDIOC_QBUF, &buf))
    errno_exit("VIDIOC_QBUF");

  CLEAR(buf);
  buf.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
  buf.memory = V4L2_MEMORY_USERPTR;

  if (xioctl(fd, VIDIOC_DQBUF, &buf) > -1) {
    //for (i = 0; i < n_buffers; i++)
    //  if (buf.m.userptr == (unsigned long)buffer[i])
    //    break;

    char cmd[80];
    char *cam_id = cameras[cam].camera;

    /*
     * Send command and status to node
     */
    sprintf(cmd, "F,%s,%02d.raw,320,240", cam_id, buf.index+1);
    fprintf(stdout, cmd);
    fflush(stdout);

    // requeue the buffer
    if (-1 == xioctl(fd, VIDIOC_QBUF, &buf))
      errno_exit("VIDIOC_QBUF");
  }
}

static void mainloop(void)
{
  int i;

  while (1) {
    for (i=0; i<n_cameras; i++) {
      set_input_standard(cameras[i].input);  // select the next video input
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
  init_streaming();

  mainloop();

  uninit_streaming();
  close_device();

  return 0;
}
