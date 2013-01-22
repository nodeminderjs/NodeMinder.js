#include <libavcodec/avcodec.h>
#include <libswscale/swscale.h>

#include "lib.h"

/*
AVFrame *inpic;
AVFrame *outpic;

void init_gray_buffer(uint8_t **outbuffer1, uint8_t **outbuffer2,
                      int width, int height, int *size)
{
  //calculate the bytes needed for the output image
  *size = avpicture_get_size(AV_PIX_FMT_GRAY8, width, height);

  //create buffer for the output image
  *outbuffer1 = (uint8_t*)av_malloc(*size);
  *outbuffer2 = (uint8_t*)av_malloc(*size);

  inpic  = avcodec_alloc_frame();
  outpic = avcodec_alloc_frame();
}
*/

/*
 * https://github.com/FFmpeg/FFmpeg/blob/master/libavutil/pixfmt.h
 *
 * pix_fmt =
 *   AV_PIX_FMT_BGR24, AV_PIX_FMT_BGR32, AV_PIX_FMT_RGB24, AV_PIX_FMT_RGB32
 *   AV_PIX_FMT_YUVJ420P
 *   AV_PIX_FMT_GRAY8
 */

int convert_scale(uint8_t *inbuffer,   int in_width,  int in_height,  char *palette,
                  uint8_t **outbuffer, int out_width, int out_height)
{
  uint32_t in_pix_fmt;
  struct SwsContext *sws_ctx;

  //set pixel format
  if (palette == "BGR24") {
    in_pix_fmt = AV_PIX_FMT_BGR24;
  } else if (palette == "BGR32") {
    in_pix_fmt = AV_PIX_FMT_BGR32;
  } else if (palette == "RGB24") {
    in_pix_fmt = AV_PIX_FMT_RGB24 ;
  } else if (palette == "RGB32") {
    in_pix_fmt = AV_PIX_FMT_RGB32;
  } else if (palette == "YUYV") {
    in_pix_fmt = AV_PIX_FMT_YUYV422;
  } else if (palette == "YUV420") {
    in_pix_fmt = AV_PIX_FMT_YUV420P;
  } else if (palette == "GREY") {
    in_pix_fmt = AV_PIX_FMT_GRAY8;
  } else {
    in_pix_fmt = AV_PIX_FMT_BGR24;  // default!
  }

  //calculate the bytes needed for the output image
  //*outsize = avpicture_get_size(out_pix_fmt, out_width, out_height);

  //create buffer for the output image
  //*outbuffer = (uint8_t*)av_malloc(*outsize);

  //create ffmpeg frame structures.  These do not allocate space for image data,
  //just the pointers and other information about the image.
  AVFrame *inpic  = avcodec_alloc_frame();
  AVFrame *outpic = avcodec_alloc_frame();

  //this will set the pointers in the frame structures to the right points in
  //the input and output buffers.
  avpicture_fill((AVPicture*)inpic,  inbuffer,   in_pix_fmt,  in_width,  in_height);
  avpicture_fill((AVPicture*)outpic, *outbuffer, AV_PIX_FMT_GRAY8, out_width, out_height);

  //create the conversion context
  sws_ctx = sws_getContext(in_width,  in_height,  in_pix_fmt,
                           out_width, out_height, AV_PIX_FMT_GRAY8,
                           SWS_FAST_BILINEAR, NULL, NULL, NULL);

  /* perform the conversion */
  int ret = sws_scale(sws_ctx, inpic->data,  inpic->linesize, 0, in_height,
                               outpic->data, outpic->linesize);
  //printf("ret = %d\n", ret);
  //save_buffer_to_file(outpic->data[0], *outsize, "./gray.raw");
  //save_buffer_to_file(outbuffer, *outsize, "./gray.raw");

  //av_free(outbuffer);
  //av_free(inpic);
  avcodec_free_frame(&inpic);
  //av_free(outpic);
  avcodec_free_frame(&outpic);
  sws_freeContext(sws_ctx);

  return ret;
}

int detect_change_gray(uint8_t *image1, uint8_t *image2, int width, int height,
                       int pix_threshold, int img_threshold)
{
  int size = width * height;
  int pixel_dif = 256 * pix_threshold / 100;
  int image_dif = size * img_threshold / 100;
  int i, diff;
  int count = 0;

  for (i = 0; i < size; i++) {
    diff = abs(image1[i] - image2[i]);
    if (diff > pixel_dif)
      count++;
    if (count > image_dif) {
      return(1);
    }
  }

  return(0);
}
