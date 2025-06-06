    .section .data
a:  .float 3.5       
b:  .float 1.4       

.section .bss
.align 8
tohost:
	.dword 0

    .section .text.init
    .globl _main

_main:
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