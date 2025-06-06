.section .data
mi_medio:
    .half 2
buffer:
    .zero 10

.align 2
entero:
    .word 9

.align 4
mifloat:
    .float 3.2
.align 1
mi_string:
    .ascii "Hola que tal! Soy de CREATOR"
    .byte 0

.align 1
mi_char:
    #.ascii "C" # O en su defecto puede ser .byte 67 (valor del caracter ascii de 'C')
    .byte 67
.align 3
midoble:
    .double 3.141516
.align 8
o_midoble:
    .dword 3

.section .bss
.align 8
tohost: .dword 0

.section .text.init
.globl _main

# Entry point of the program
_main:
    li a7, 5 # leer de teclado un entero
    ecall
    li a7, 1 # imprimir un entero
    ecall
    li a7, 6 # leer de teclado un float
    ecall
    li a7, 2 # imprimir un float
    ecall 
    li a7, 7 # leer de teclado un double
    ecall
    li a7, 3 # imprimir un double
    ecall
    li a7, 12 # leer de teclado un char
    ecall
    li a7, 11 # imprimir un char
    ecall
    la a0, buffer
    li a1, 4
    li a7, 8 # Leer un string
    ecall
    li a7, 4 # imprimir un string
    ecall
    la a0, mi_string # conservando el valor de a7 imprimimos un mensaje de la seccion data
    ecall

    li a7, 10 # exit
    ecall
