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
        sh 'ls -la'
      }
    }
  }
}
