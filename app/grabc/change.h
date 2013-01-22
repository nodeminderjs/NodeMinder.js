/**
 * Copyright NodeMinder.js
 */
#ifndef NODEMINDERJS_CHANGE_H
#define NODEMINDERJS_CHANGE_H

//void init_gray_buffer(uint8_t **outbuffer1, uint8_t **outbuffer2,
//                      int width, int height, int *size);

int convert_scale(uint8_t *inbuffer,  int in_width,  int in_height,  char *palette,
                  uint8_t **outbuffer, int out_width, int out_height);

int detect_change_gray(uint8_t *image1, uint8_t *image2, int width, int height,
                       int pix_threshold, int img_threshold);

#endif /* NODEMINDERJS_CHANGE_H */
