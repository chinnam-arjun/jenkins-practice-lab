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
        bat 'ls -la'
      }
    }
  }
}
