# ══════════════════════════════════════════════════════════
# ProGuard / R8 Rules for Block Burst (Capacitor + AdMob)
# ══════════════════════════════════════════════════════════

# ─── Capacitor Core ───
-keep class com.getcapacitor.** { *; }
-keep class com.devlancestudio.blockburst.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ─── Capacitor Community Plugins (AdMob) ───
-keep class com.getcapacitor.community.** { *; }
-keep class com.getcapacitor.community.admob.** { *; }
-keep class com.getcapacitor.community.admob.admob.** { *; }
-keep class com.getcapacitor.community.admob.banner.** { *; }
-keep class com.getcapacitor.community.admob.interstitial.** { *; }
-keep class com.getcapacitor.community.admob.rewarded.** { *; }
-keep class com.getcapacitor.community.admob.rewardedinterstitial.** { *; }
-keep class com.getcapacitor.community.admob.consent.** { *; }
-keep class com.getcapacitor.community.admob.helpers.** { *; }
-keep class com.getcapacitor.community.admob.models.** { *; }

# ─── Google Mobile Ads SDK (comprehensive) ───
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.** { *; }
-keep class com.google.android.gms.internal.ads.** { *; }
-keep class com.google.android.gms.measurement.** { *; }
-keep class com.google.android.gms.ads.MobileAds { *; }
-keep class com.google.android.gms.ads.initialization.** { *; }
-keep class com.google.android.gms.ads.AdView { *; }
-keep class com.google.android.gms.ads.AdRequest { *; }
-keep class com.google.android.gms.ads.AdRequest$Builder { *; }
-keep class com.google.android.gms.ads.InterstitialAd { *; }
-keep class com.google.android.gms.ads.rewarded.** { *; }
-keep class com.google.android.gms.ads.admanager.** { *; }
-keep class com.google.android.gms.ads.nativead.** { *; }

# ─── Google User Messaging Platform (consent) ───
-keep class com.google.android.ump.** { *; }

# ─── Google Play Services base ───
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.tasks.** { *; }

# ─── Mediation adapters (loaded via reflection) ───
-keepnames class * implements com.google.android.gms.ads.mediation.MediationAdapter
-keepnames class * implements com.google.android.gms.ads.mediation.MediationBannerAdapter
-keepnames class * implements com.google.android.gms.ads.mediation.MediationInterstitialAdapter

# ─── Kotlin (required by capacitor-community/admob plugin) ───
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings {
    <fields>;
}
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}
-assumenosideeffects class kotlin.jvm.internal.Intrinsics {
    static void checkParameterIsNotNull(...);
    static void checkNotNullParameter(...);
    static void checkExpressionValueIsNotNull(...);
    static void checkNotNullExpressionValue(...);
    static void checkReturnedValueIsNotNull(...);
    static void checkFieldIsNotNull(...);
    static void throwUninitializedPropertyAccessException(...);
}

# ─── Kotlin Coroutines ───
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.** {
    volatile <fields>;
}
-dontwarn kotlinx.coroutines.**

# ─── Keep WebView JavaScript interface ───
-keepattributes JavascriptInterface

# ─── Keep annotations and metadata ───
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes Exceptions

# ─── Preserve line numbers for crash reports ───
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ─── Suppress warnings for known safe dependencies ───
-dontwarn com.google.android.gms.**
-dontwarn com.google.ads.**
-dontwarn org.jetbrains.annotations.**
-dontwarn javax.annotation.**
