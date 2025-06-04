.section .bss
.align 8
tohost: 
    .dword 0

.section .text.init
.globl _main

_main:

    li t0, 2
    li t1, 1
    loop:
        add t2, t0, t1
        addi t0, t0, 1
        addi t1, t1, 1
        bnez t2, loop

    li a7, 10
    ecall