    .section .data
a:  .word 12     
b:  .word 5       

.section .bss
.align 8
tohost:
	.dword 0

    .section .text.init
    .globl _main

_main:
    la t0, a      
    lw t1, 0(t0)   

    la t0, b       
    lw t2, 0(t0)    

    mul t3, t1, t2

    div t4, t1, t2

    rem t5, t1, t2

	li a7, 10
    ecall