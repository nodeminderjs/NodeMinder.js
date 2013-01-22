# use pkg-config for getting CFLAGS and LDLIBS
FFMPEG_LIBS=    libavcodec                         \
                libswscale                         \
                
CFLAGS += -Wall -O2 -g
CFLAGS := $(shell pkg-config --cflags $(FFMPEG_LIBS)) $(CFLAGS)
LDLIBS := $(shell pkg-config --libs $(FFMPEG_LIBS)) $(LDLIBS)

EXAMPLES=       encoding                  

OBJS=$(addsuffix .o,$(EXAMPLES))

# the following examples make explicit use of the math library
encoding: LDLIBS += -lm

grabc: grab.c encode.c encode.h change.c change.h lib.c lib.h
	gcc -w grab.c encode.c lib.c change.c -o grab $(CFLAGS) $(LDLIBS)





