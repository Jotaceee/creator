    .section .data
a:  .float 3.5       
b:  .float 1.4      

.align 3
v_1:
    .word 7,8,9,-13
.align 3
v_2:
    .word 62, 54, -684, 379
.align 3
v_mem:
    .space 64
.align 1
un_string:
	.asciz "Ejecucion completa con instrucciones IMFD, vectoriales y comprimidas!"

.section .bss
.align 8
tohost:
	.dword 0

    .section .text.init
    .globl _main

_main:
	
    la a0, un_string
    li a7, 4
    ecall
    
    li t0, 4
    vsetvli t1, t0, e32
    la t2, v_1
    la t3, v_2
    vle32.v v1, 0(t2)
    vle32.v v2, 0(t3)
    vadd.vv v3, v1, v2
    la t1, v_mem
    vse32.v v3, 0(t1)

    la   t0, a        
    flw  f1, 0(t0)    

    la   t0, b         
    flw  f2, 0(t0)    

    fadd.s f3, f1, f2

    fsub.s f4, f1, f2

    fmul.s f5, f1, f2

    fdiv.s f6, f1, f2
    
    
	li a7, 10
    ecall