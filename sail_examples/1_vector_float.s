.section .data
.align 2
v_1:
    .float 7.7 ,8.8 ,9.9 ,-13.13 
.align 2
v_2:
    .float 62.62 , 54.54, -684.684, 379.379
.align 2
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
    