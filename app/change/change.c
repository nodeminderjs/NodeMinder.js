#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/mman.h>

#define BYTES_PIXEL 3

int   pix_limit;
int   img_limit;
int   width = 320;
int   height = 240;
int   imagesize;
char *buffer[2];

int detect_change()
{
  int pixel_dif = 256 * pix_limit / 100;
  int image_dif = imagesize * img_limit / 100 / BYTES_PIXEL;
  int i, j, diff;
  int count = 0;

  i = 0;
  while (i < imagesize ) {
    for (j = 0; j < BYTES_PIXEL; j++) {
      diff = abs(buffer[0][i+j] - buffer[1][i+j]);
      if (diff > pixel_dif) {
        count++;
        break;
      }
    }
    if (count > image_dif) {
      return(1);
    }
    i += 3;
  }

  return(0);
}

int main(int argc, char *argv[])
{
  // ex.: ./change /dev/shm/01-1.raw /dev/shm/01-2.raw 16 9
  int i, f;

  imagesize = width * height * 3;

  for (i=0; i<2; i++) {
    f = open(argv[i+1], O_RDONLY);
    buffer[i] = mmap(NULL,            /* start anywhere */
                     imagesize,
                     PROT_READ,       /* required */
                     MAP_SHARED,      /* recommended */
                     f, 0);
    if (MAP_FAILED == buffer[i]) {
      perror("mmap");
      exit (EXIT_FAILURE);
    }
    close(f);
  }

  pix_limit = atoi(argv[3]);
  img_limit = atoi(argv[4]);

  fprintf(stdout, "%d", detect_change());
  fflush(stdout);
}
