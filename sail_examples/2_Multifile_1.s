.section .bss
.align 8
tohost: .dword 0


.section .text.init
.globl _main
    
mi_funcion:
    li t1, 2
    li t2, 3
    add t3, t1, t2
    addi sp, sp, -16
    sd ra, 4(sp)
    call another_function
    ld ra, 4(sp)
    addi sp, sp, 16
    ret
    
_main:
    call mi_funcion
    li a7, 10
    ecall
    