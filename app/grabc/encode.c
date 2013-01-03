/**
 * Copyright NodeMinder.js
 */
#include <libavcodec/avcodec.h>
#include <libswscale/swscale.h>

#define RAW_PIX_FMT  AV_PIX_FMT_BGR24
#define YUV_PIX_FMT  AV_PIX_FMT_YUVJ420P
#define JPG_PIX_FMT  AV_PIX_FMT_YUVJ420P

#define CONFIG_MJPEG_ENCODER 1
#define CONFIG_MJPEG_PARSER 1

#define REGISTER_ENCODER(X,x) { \
           extern AVCodec ff_##x##_encoder; \
           if(CONFIG_##X##_ENCODER)  avcodec_register(&ff_##x##_encoder); }

#define REGISTER_PARSER(X,x) { \
           extern AVCodecParser ff_##x##_parser; \
           if(CONFIG_##X##_PARSER)  av_register_codec_parser(&ff_##x##_parser); }

#define REGISTER_BSF(X,x) { \
           extern AVBitStreamFilter ff_##x##_bsf; \
           if(CONFIG_##X##_BSF)     av_register_bitstream_filter(&ff_##x##_bsf); }

/*
 * JPEG encoding function
 */
void encode2jpeg(const char *filename, uint8_t *inbuffer)
{
    AVCodec *codec;
    AVCodecContext *c = NULL;
    int ret, got_output;
    FILE *f;
    AVFrame *frame;
    AVPacket pkt;

    int in_width   = 320,
        in_height  = 240,
        out_width  = 320,
        out_height = 240;

    static struct SwsContext *sws_ctx;

    /* register all the codecs */
    //avcodec_register_all();
    REGISTER_ENCODER(MJPEG, mjpeg);
    REGISTER_PARSER(MJPEG, mjpeg);

    //calculate the bytes needed for the output image
    int nbytes = avpicture_get_size(YUV_PIX_FMT, out_width, out_height);

    //create buffer for the output image
    uint8_t* outbuffer = (uint8_t*)av_malloc(nbytes);

    //create ffmpeg frame structures.  These do not allocate space for image data,
    //just the pointers and other information about the image.
    AVFrame* inpic  = avcodec_alloc_frame();
    AVFrame* outpic = avcodec_alloc_frame();

    //this will set the pointers in the frame structures to the right points in
    //the input and output buffers.
    avpicture_fill((AVPicture*)inpic,  inbuffer,  RAW_PIX_FMT, in_width,  in_height);
    avpicture_fill((AVPicture*)outpic, outbuffer, YUV_PIX_FMT, out_width, out_height);

    //create the conversion context
    sws_ctx = sws_getContext(in_width,  in_height,  RAW_PIX_FMT,
                                out_width, out_height, YUV_PIX_FMT,
                                SWS_FAST_BILINEAR, NULL, NULL, NULL);

    //perform the conversion
    ret = sws_scale(sws_ctx, inpic->data, inpic->linesize, 0, in_height, outpic->data, outpic->linesize);

    /*
     * Encode the frame here...
     */

    /* find the mjpeg video encoder */
    codec = avcodec_find_encoder(AV_CODEC_ID_MJPEG);
    if (!codec) {
        fprintf(stderr, "encode.c: codec not found\n");
        exit(1);
    }

    /*
     *  Allocate/init a context
     */

    c = avcodec_alloc_context3(codec);
    if (!c) {
        fprintf(stderr, "encode.c: could not allocate video codec context\n");
        //free memory
        av_free(outbuffer);
        av_free(inpic);
        av_free(outpic);
        exit(1);
    }

    /* put sample parameters */
    c->bit_rate = 400000;
    /* resolution must be a multiple of two */
    c->width = 320;
    c->height = 240;
    /* frames per second */
    c->time_base = (AVRational){1,25};
    c->pix_fmt = JPG_PIX_FMT;

    /* open it */
    if (avcodec_open2(c, codec, NULL) < 0) {
        fprintf(stderr, "Could not open codec\n");
        //free memory
        av_free(c);
        av_free(outbuffer);
        av_free(inpic);
        av_free(outpic);
        exit(1);
    }

    av_init_packet(&pkt);
    pkt.data = NULL;    // packet data will be allocated by the encoder
    pkt.size = 0;

    outpic->pts = 0;

    /* encode the image */
    ret = avcodec_encode_video2(c, &pkt, outpic, &got_output);

    if (ret < 0) {
      fprintf(stderr, "encode.c: error encoding frame\n");
      //free memory
      av_free_packet(&pkt);
      avcodec_close(c);
      av_free(c);
      av_free(outbuffer);
      av_free(inpic);
      av_free(outpic);
      exit(1);
    }

    if (got_output) {
      // Open/create the output file
      f = fopen(filename, "wb");
      if (!f) {
          fprintf(stderr, "encode.c: could not open %s\n", filename);
          //free memory
          av_free_packet(&pkt);
          avcodec_close(c);
          av_free(c);
          av_free(outbuffer);
          av_free(inpic);
          av_free(outpic);
          exit(1);
      }

      fwrite(pkt.data, 1, pkt.size, f);

      fclose(f);
    }

    //free memory
    av_free_packet(&pkt);
    avcodec_close(c);
    av_free(c);
    av_free(outbuffer);
    av_free(inpic);
    av_free(outpic);
}
