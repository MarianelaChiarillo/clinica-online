import { AbstractControl, ValidationErrors } from '@angular/forms';

export function emailDominioValidator(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;

  if (valor === null || valor === undefined || valor === '' || typeof valor !== 'string') {
    return null;
  }

  const dominiosPermitidos: string[] = ['@gmail.com', '@yahoo.com', '@outlook.com'];
  
  let tieneDominioValido: boolean = false;
  
  for (let i: number = 0; i < dominiosPermitidos.length; i++) {
    const dominioActual: string = dominiosPermitidos[i];
    let contieneDominio: boolean = false;
    
    for (let j: number = 0; j <= valor.length - dominioActual.length; j++) {
      let coincide: boolean = true;
      
      for (let k: number = 0; k < dominioActual.length; k++) {
        if (valor[j + k] !== dominioActual[k]) {
          coincide = false;
          break;
        }
      }
      
      if (coincide === true) {
        contieneDominio = true;
        break;
      }
    }
    
    if (contieneDominio === true) {
      tieneDominioValido = true;
      break;
    }
  }

  if (tieneDominioValido === false) {
    return { 
      dominioInvalido: 'El email debe ser de un dominio válido como @gmail.com o @yahoo.com.' 
    };
  }

  return null;
}