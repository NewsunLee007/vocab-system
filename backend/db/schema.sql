CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(32) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(50) NULL,
  role ENUM('admin','teacher') NOT NULL DEFAULT 'teacher',
  password_hash VARCHAR(255) NOT NULL,
  password_changed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(32) PRIMARY KEY,
  teacher_id VARCHAR(32) NULL,
  class_name VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_changed TINYINT(1) NOT NULL DEFAULT 0,
  coins INT NOT NULL DEFAULT 0,
  badges JSON NULL,
  streak INT NOT NULL DEFAULT 0,
  total_learned INT NOT NULL DEFAULT 0,
  total_tests INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_class_name (class_name, name),
  KEY idx_students_teacher_id (teacher_id),
  CONSTRAINT fk_students_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id VARCHAR(32) PRIMARY KEY,
  teacher_id VARCHAR(32) NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(32) NULL,
  textbook VARCHAR(32) NULL,
  grade VARCHAR(32) NULL,
  volume VARCHAR(32) NULL,
  unit VARCHAR(32) NULL,
  words JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_vocab_teacher_id (teacher_id),
  CONSTRAINT fk_vocab_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS learning_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(32) NOT NULL,
  vocabulary_id VARCHAR(32) NULL,
  record_type VARCHAR(32) NOT NULL,
  payload JSON NOT NULL,
  score INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_lr_student_created (student_id, created_at),
  KEY idx_lr_vocab_created (vocabulary_id, created_at),
  CONSTRAINT fk_lr_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_lr_vocab FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE SET NULL
);

