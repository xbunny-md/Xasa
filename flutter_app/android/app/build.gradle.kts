import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-plugin-loader")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
}

val hasReleaseSigning =
    (keystoreProperties.getProperty("storeFile")?.isNotBlank() == true) ||
    (!System.getenv("ANDROID_KEYSTORE_PATH").isNullOrBlank())

android {
    namespace = "com.odyx.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.odyx.app"
        minSdk = 23
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        multiDexEnabled = true
    }

    signingConfigs {
        create("release") {
            val storeFilePath =
                keystoreProperties.getProperty("storeFile")
                    ?: System.getenv("ANDROID_KEYSTORE_PATH")
            val storePass =
                keystoreProperties.getProperty("storePassword")
                    ?: System.getenv("ANDROID_KEYSTORE_PASSWORD")
            val alias =
                keystoreProperties.getProperty("keyAlias")
                    ?: System.getenv("ANDROID_KEY_ALIAS")
            val keyPass =
                keystoreProperties.getProperty("keyPassword")
                    ?: System.getenv("ANDROID_KEY_PASSWORD")

            if (!storeFilePath.isNullOrBlank()) {
                storeFile = file(storeFilePath)
            }
            if (!storePass.isNullOrBlank()) {
                storePassword = storePass
            }
            if (!alias.isNullOrBlank()) {
                keyAlias = alias
            }
            if (!keyPass.isNullOrBlank()) {
                keyPassword = keyPass
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseSigning) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

flutter {
    source = "../.."
}

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}
