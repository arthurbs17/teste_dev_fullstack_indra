-- ============================================================================
-- Schema do banco de dados fictício "Hospital Vida Plena"
-- Executado automaticamente pelo Postgres na primeira inicialização do
-- container (docker-entrypoint-initdb.d).
-- ============================================================================

CREATE TABLE departments (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    total_beds  INTEGER NOT NULL CHECK (total_beds > 0)
);

CREATE TABLE staff (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    role            VARCHAR(50) NOT NULL CHECK (role IN ('médico', 'enfermeiro')),
    department_id   INTEGER NOT NULL REFERENCES departments(id)
);

CREATE TABLE patients (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    birth_date  DATE NOT NULL,
    gender      CHAR(1) NOT NULL CHECK (gender IN ('M', 'F')),
    document    VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE admissions (
    id                  SERIAL PRIMARY KEY,
    patient_id          INTEGER NOT NULL REFERENCES patients(id),
    department_id       INTEGER NOT NULL REFERENCES departments(id),
    attending_staff_id  INTEGER REFERENCES staff(id),
    bed_number          INTEGER NOT NULL,
    admission_date      TIMESTAMP NOT NULL,
    discharge_date      TIMESTAMP,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('internado', 'alta', 'obito')),
    diagnosis           VARCHAR(200),
    CHECK (discharge_date IS NULL OR discharge_date >= admission_date)
);

CREATE TABLE exams (
    id              SERIAL PRIMARY KEY,
    admission_id    INTEGER NOT NULL REFERENCES admissions(id),
    exam_type       VARCHAR(100) NOT NULL,
    requested_at    TIMESTAMP NOT NULL,
    result_at       TIMESTAMP,
    status          VARCHAR(20) NOT NULL CHECK (status IN ('solicitado', 'em_andamento', 'concluido')),
    result_value    VARCHAR(200)
);

CREATE TABLE vital_signs (
    id                  SERIAL PRIMARY KEY,
    admission_id        INTEGER NOT NULL REFERENCES admissions(id),
    measured_at         TIMESTAMP NOT NULL,
    heart_rate          INTEGER,
    systolic_pressure   INTEGER,
    diastolic_pressure  INTEGER,
    temperature         NUMERIC(4,1),
    oxygen_saturation   INTEGER
);

-- Índices para apoiar as consultas mais comuns de um dashboard
CREATE INDEX idx_admissions_department ON admissions(department_id);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_admissions_patient ON admissions(patient_id);
CREATE INDEX idx_exams_admission ON exams(admission_id);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_vitals_admission ON vital_signs(admission_id);
CREATE INDEX idx_vitals_measured_at ON vital_signs(measured_at);
