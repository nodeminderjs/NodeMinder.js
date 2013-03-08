/**
 * Copyright NodeMinder.js
 */
#ifndef NODEMINDERJS_ENCODE_H
#define NODEMINDERJS_ENCODE_H

#include <stdint.h>

void encode2jpeg(uint8_t *imgbuffer, const char *filename);
void init_encode(char *palette, int i_width, int i_height, int o_width, int o_height);
void uninit_encode(void);

#endif /* NODEMINDERJS_ENCODE_H */
