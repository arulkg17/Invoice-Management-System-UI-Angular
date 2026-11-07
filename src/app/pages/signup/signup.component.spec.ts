import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should require username, email and password', () => {
    expect(component.form.controls.userName.valid).toBeFalse();
    expect(component.form.controls.email.valid).toBeFalse();
    expect(component.form.controls.password.valid).toBeFalse();
  });

  it('should reject mismatched passwords', () => {
    component.form.controls.password.setValue('Password@123');
    component.form.controls.confirmPassword.setValue('Password@456');

    expect(component.form.hasError('passwordMismatch')).toBeTrue();
  });

  it('should accept matching passwords', () => {
    component.form.controls.password.setValue('Password@123');
    component.form.controls.confirmPassword.setValue('Password@123');

    expect(component.form.hasError('passwordMismatch')).toBeFalse();
  });
});
