.section .data

.align 4
pi:
	.float 3.141516

.section .text.init
.globl circumference_area

# Complete your main function here
circumference_area:
	la t0, pi
    flw ft0, 0(t0)
    fcvt.s.w ft1, a0
    fmul.s ft2, ft1, ft1
    fmul.s fa0, ft2, ft0
    li a7, 2
    ecall
    jr ra
    