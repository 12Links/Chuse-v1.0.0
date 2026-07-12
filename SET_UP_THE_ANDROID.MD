npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap init
npx cap add android
npx cap sync
npx cap open android

What to do once Android Studio opens:
Wait for the Sync: Look at the bottom right corner of the Android Studio window. You will see a loading bar saying "Gradle Sync". Do not click anything until this finishes! It is downloading all the necessary Android build tools.

Connect your Phone: Plug your Android phone into your laptop via USB. (Make sure you have "Developer Options" and "USB Debugging" enabled in your phone's settings).

Select your Device: At the top of Android Studio, you should see a dropdown menu right next to a green "Play" button. Your connected phone should appear in that list.

Hit Play! Click the green Play (Run) button. Android Studio will build the .apk, install it directly onto your phone, and launch it automatically.

Requirements: 
ANDROID STUDIO must be installed and configured. You can download it from https://developer.android.com/studio. Make sure to set up the Android SDK and emulator as well.
JAVA Development Kit (JDK) must be installed. You can download it from https://www.oracle.com/java/technologies/javase-jdk11-downloads.html. Make sure to set the JAVA_HOME environment variable.

