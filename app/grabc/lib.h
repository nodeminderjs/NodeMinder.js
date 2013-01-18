/**
 * Copyright NodeMinder.js
 */
#ifndef NODEMINDERJS_LIB_H
#define NODEMINDERJS_LIB_H

#include <time.h>
#include <sys/time.h>  // for gettimeofday()

void save_buffer_to_file(uint8_t *buffer, size_t size, const char *filename);
void load_file_to_buffer(const char *filename, uint8_t *buffer, size_t size);
long get_elapsed_ms(struct timeval t1, struct timeval t2);
int xsleep(time_t s, long ms);

void acquire_file_lock(int fd, int retry_ms);
void release_file_lock(int fd);

void errno_exit(const char *s);
int xioctl(int fh, int request, void *arg);

#endif /* NODEMINDERJS_LIB_H */
