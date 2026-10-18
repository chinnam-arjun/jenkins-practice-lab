pipeline {
  agent {
    label 'built-in'
  }
  triggers {
    githubPush()
  }
  stages{
    stage('Build'){
      steps {
        checkout scm;
        dir('node-pipeline') {
            // Lists all hidden, system, and regular files with details on Windows
            bat 'dir /a /q' 
        }
      }
    }
  }
}
