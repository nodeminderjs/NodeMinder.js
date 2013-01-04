/**
 * Copyright NodeMinder.js
 */
#ifndef NODEMINDERJS_ENCODE_H
#define NODEMINDERJS_ENCODE_H

#include <stdint.h>

void encode2jpeg(const char *filename);
void init_encode(uint8_t *imgbuffer);
void uninit_encode(void);

#endif /* NODEMINDERJS_ENCODE_H */
