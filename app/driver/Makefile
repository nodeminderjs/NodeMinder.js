# use pkg-config for getting CFLAGS and LDLIBS
#CFLAGS += -Wall -O2 -g
#CFLAGS += -Wall -O2 -lrt
CFLAGS += -Wall -O2

all: nmjs-gv-800 nmjs-gv-800-read

nmjs-gv-800: gv-800.c
	gcc -w gv-800.c -o nmjs-gv-800 $(CFLAGS)

nmjs-gv-800-read: gv-800-read.c
	gcc -w gv-800-read.c -o nmjs-gv-800-read $(CFLAGS)


