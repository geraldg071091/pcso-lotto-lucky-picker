import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { isDevMode } from '@angular/core';
import { AppComponent } from './app/app.component';
import { LOTTERY_FEATURE_KEY, lotteryReducer } from './app/store/lottery.reducer';
import { LotteryEffects } from './app/store/lottery.effects';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideStore({ [LOTTERY_FEATURE_KEY]: lotteryReducer }),
    provideEffects([LotteryEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
}).catch(err => console.error(err));
