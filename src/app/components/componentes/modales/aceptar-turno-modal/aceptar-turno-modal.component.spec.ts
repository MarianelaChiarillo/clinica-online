import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AceptarTurnoModalComponent } from './aceptar-turno-modal.component';

describe('AceptarTurnoModalComponent', () => {
  let component: AceptarTurnoModalComponent;
  let fixture: ComponentFixture<AceptarTurnoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AceptarTurnoModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AceptarTurnoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
