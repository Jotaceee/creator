.section .data

.align 1
string_print:
.asciz "Float almacenado en memoria y en la posicion "

.align 2
V_f_1: 
    .float 37.3733, 24.5306, 92.6184, 15.2369

.align 2
V_f_2:
    .float 4.4947, 26.8523, 62.9449, 55.7993

.align 2
v_m:
    .space 16


.section .bss
.align 8
tohost:
    .dword 0

.section .text.init
.globl _main

vector_calculator:
    mv t2, a0
    mv t3, a1
    li t0, 4
    vsetvli t1, t0, e32, m1

    vle32.v v0, 0(t2)
    vle32.v v1, 0(t3)

    vfadd.vv v2, v1, v0
    vse32.v v2, 0(a2)

    la a0, string_print
    li a7, 4
    ecall

    li a0, 0
    li a7, 1
    ecall

    li a0, 58
    li a7, 11
    ecall

    li a7, 2
    flw fa0, 0(a2)
    ecall

    li a0, 10
    li a7, 11
    ecall

    la a0, string_print
    li a7, 4
    ecall

    li a0, 1
    li a7, 1
    ecall

    li a0, 58
    li a7, 11
    ecall
   
    li a7, 2
    flw fa0, 4(a2)
    ecall

    li a0, 10
    li a7, 11
    ecall

    la a0, string_print
    li a7, 4
    ecall

    li a0, 2
    li a7, 1
    ecall

    li a0, 58
    li a7, 11
    ecall

    li a7, 2
    flw fa0, 8(a2)
    ecall

    li a0, 10
    li a7, 11
    ecall

    la a0, string_print
    li a7, 4
    ecall

    li a0, 3
    li a7, 1
    ecall

    li a0, 58
    li a7, 11
    ecall

    li a7, 2
    flw fa0, 12(a2)
    ecall

    ret

_main:

    la a0, V_f_1
    la a1, V_f_2
    la a2, v_m
    call vector_calculator
    
    c.li s0, 10
    mv a7, s0
    ecall