package com.gkdmobility.app;

import android.os.Bundle;
import android.util.Log;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);

        final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(Thread paramThread, Throwable paramThrowable) {
                Log.e(TAG, "Uncaught native exception on thread " + (paramThread != null ? paramThread.getName() : "unknown"), paramThrowable);
                if (paramThrowable != null && paramThrowable.getMessage() != null) {
                    String msg = paramThrowable.getMessage().toLowerCase();
                    if (msg.contains("firebaseapp") || msg.contains("alarm") || msg.contains("notification") || msg.contains("fileuriexposed")) {
                        Log.w(TAG, "Prevented app shutdown from non-fatal native exception: " + msg);
                        return;
                    }
                }
                if (defaultHandler != null) {
                    defaultHandler.uncaughtException(paramThread, paramThrowable);
                }
            }
        });

        super.onCreate(savedInstanceState);
    }
}

