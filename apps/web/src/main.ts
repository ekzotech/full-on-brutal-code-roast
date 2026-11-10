import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';

@Component({ template: '<h1>Full-on Brutal Code Roast</h1>' })
class Home {}

@Component({ selector: 'roast-app', imports: [RouterOutlet], template: '<router-outlet />' })
class App {}

void bootstrapApplication(App, {
  providers: [provideRouter([{ path: '', component: Home }])],
});
