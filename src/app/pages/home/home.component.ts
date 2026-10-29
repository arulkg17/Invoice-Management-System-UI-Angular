import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/loginrequest';
import { FormsModule } from '@angular/forms';
import { RouterLink} from '@angular/router';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  isLoginSuccess: boolean | null = null;
  userName = 'admin';
  password = 'Admin@123';
  message = '';

  constructor(private service: AuthService) {}
  login() {
    const param: LoginRequest = {
      userName: this.userName,
      password: this.password,
    };
    this.service.login(param).subscribe({
      next: (response) => {
        console.log("Login response=",response);
        this.service.setSession(response.data.token, response.data.expiration);
        this.isLoginSuccess = true;
        this.message = 'Login Successfull';
      },
      error: (err) => {
        this.isLoginSuccess = false;
        this.message = 'Login Failed';
        console.error(err);
      },
    });
  }
}
