# Capacitor & WebView rules
-keep class com.getcapacitor.** { *; }
-keep class com.devlance.blockblast.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# AdMob
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.** { *; }

# Keep JavaScript interface for WebView
-keepattributes JavascriptInterface

# Keep annotations
-keepattributes *Annotation*

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
