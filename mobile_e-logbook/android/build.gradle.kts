allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory = rootProject.layout.buildDirectory.dir("../../build").get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
    
    // Fix for geolocator_android and other plugins
    project.ext.set("flutter", mapOf(
        "minSdkVersion" to 21,
        "targetSdkVersion" to 36,
        "compileSdkVersion" to 36,
        "versionCode" to 1,
        "versionName" to "1.0.0"
    ))
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
