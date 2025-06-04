.section .data
.align 3
v_1:
    .word 7,8,9,-13
.align 3
v_2:
    .word 62, 54, -684, 379
.align 3
v_mem:
    .space 64

.section .bss
.align 8
tohost: .dword 0

.section .text.init
.globl _main

_main:

    li t0, 4
    vsetvli t1, t0, e32
    la t2, v_1
    la t3, v_2
    vle32.v v1, 0(t2)
    vle32.v v2, 0(t3)
    vadd.vv v3, v1, v2
    la t1, v_mem
    vse32.v v3, 0(t1)

    li a7, 10
    ecall
    