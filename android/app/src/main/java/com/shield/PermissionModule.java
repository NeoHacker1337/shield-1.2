package com.shield;

import android.os.Build;
import android.os.Environment;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class PermissionModule extends ReactContextBaseJavaModule {
    
    public PermissionModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "PermissionModule";
    }

    @ReactMethod
    public void hasManageExternalStorage(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            boolean hasPermission = Environment.isExternalStorageManager();
            promise.resolve(hasPermission);
        } else {
            // For Android 10 and below, always return true
            promise.resolve(true);
        }
    }
}
