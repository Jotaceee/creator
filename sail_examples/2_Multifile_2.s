    .section .text.init
.globl another_function 

third_function:
	li t0, 28
    add t2, t4, t0
    ret

another_function:
	li t4, 1
    addi sp, sp, -16
    sd ra, 4(sp)
    call third_function
    ld ra, 4(sp)
    addi sp, sp, 16
    jr ra

    