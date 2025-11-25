import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmarEmail } from './confirmar-email';

describe('ConfirmarEmail', () => {
  let component: ConfirmarEmail;
  let fixture: ComponentFixture<ConfirmarEmail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarEmail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmarEmail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
