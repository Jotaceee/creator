.section .data

.align 2
radio:
	.word 8

.section .bss
.align 8
tohost:	.dword 0

.section .text.init
.globl _main

# Complete your main function here
_main:
	la t0, radio
	lw	a0, 0(t0)
    call circumference_area
    li a7, 10
    ecall
    