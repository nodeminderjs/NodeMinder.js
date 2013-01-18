#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <errno.h>
#include <sys/time.h>           // for gettimeofday()
#include <sys/file.h>

void save_buffer_to_file(uint8_t *buffer, size_t size, const char *filename)
{
  FILE *f = fopen(filename, "wb");
  if (!f) {
    fprintf(stderr, "lib.c: could not open %s to write buffer\n", filename);
    exit(1);
  }
  fwrite(buffer, 1, size, f);
  fclose(f);
}

void load_file_to_buffer(const char *filename, uint8_t *buffer, size_t size)
{
  FILE *f = fopen(filename, "rb");
  if (!f) {
    fprintf(stderr, "lib.c: could not open %s to read to buffer\n", filename);
    exit(1);
  }
  fread(buffer, size, 1, f);
  fclose(f);
}

long get_elapsed_ms(struct timeval t1, struct timeval t2)
{
  /*
  Compute and return the elapsed time in ms
  Usage example:
    #include <sys/time.h>  // for gettimeofday()

    struct timeval t1, t2;
    // start timer
    gettimeofday(&t1, NULL);

    // do something
    // ...

    // stop timer
    gettimeofday(&t2, NULL);
    // print elapsed time in ms
    printf("%d ms.\n", get_elapsed_ms(t1, t2));
  */
  long elapsedTime;
  elapsedTime = (t2.tv_sec - t1.tv_sec) * 1000;      // sec to ms
  elapsedTime += (t2.tv_usec - t1.tv_usec) / 1000;   // us to ms, rounding down
  return elapsedTime;
}

int xsleep(time_t s, long ms)
{
  struct timespec tv;
  // Construct the timespec from the number of whole seconds...
  tv.tv_sec = s;
  // ...and the remainder in miliseconds converted to nanoseconds
  tv.tv_nsec = ms * 1e+6;  // ms must be in the 0..999 interval

  while (1) {
    // Sleep for the time specified in tv. If interrupted by a
    // signal, place the remaining time left to sleep back into tv.
    int rval = nanosleep(&tv, &tv);
    if (rval == 0)
      // Completed the entire sleep time; all done.
      return 0;
    else if (errno == EINTR)
      // Interrupted by a signal. Try again.
      continue;
    else
      // Some other error; bail out.
      return rval;
  }
  return 0;
}

//void acquire_file_lock(const char *filename, int retry_ms)
void acquire_file_lock(int fd, int retry_ms)
{
  int rc;

  /*
  lck = open(filename, O_RDWR | O_CREAT, 0666);  // open or create lockfile
  if (lck == -1) {
    fprintf(stderr, "lib.c: could not open %s to lock\n", filename);
    exit(1);
  }
  */

  for (;;) {
    rc = flock(fd, LOCK_EX | LOCK_NB); // grab exclusive lock, fail if can't obtain.
    if (rc == -1) {
      // fail - sleep retry_ms (ms) and try again
      xsleep(0, retry_ms);
    } else {
      // success - return
      return;
    }
  }
}

void release_file_lock(int fd)
{
  flock(fd, LOCK_UN | LOCK_NB);

}

void errno_exit(const char *s)
{
  fprintf(stderr, "%s error %d, %s\n", s, errno, strerror(errno));
  exit(EXIT_FAILURE);
}

int xioctl(int fh, int request, void *arg)
{
  int r;

  do {
    r = ioctl(fh, request, arg);
  } while (-1 == r && EINTR == errno);

  return r;
}
