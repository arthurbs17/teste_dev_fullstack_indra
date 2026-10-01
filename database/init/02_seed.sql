-- ============================================================================
-- Dados fictícios do "Hospital Vida Plena"
-- Todos os nomes, documentos e dados clínicos são gerados artificialmente
-- apenas para fins de teste técnico. Qualquer semelhança com pessoas reais
-- é mera coincidência.
-- ============================================================================

SELECT setseed(0.42);

-- ----------------------------------------------------------------------------
-- Departamentos
-- ----------------------------------------------------------------------------
INSERT INTO departments (name, total_beds) VALUES
    ('Pronto Socorro', 20),
    ('Clínica Médica', 30),
    ('UTI', 15),
    ('Pediatria', 20),
    ('Cirurgia', 15);

-- ----------------------------------------------------------------------------
-- Equipe (médicos e enfermeiros) por departamento
-- ----------------------------------------------------------------------------
INSERT INTO staff (name, role, department_id)
VALUES
    ('Ana Beatriz Souza',      'médico',     1),
    ('Carlos Eduardo Lima',    'médico',     1),
    ('Patrícia Gomes',         'enfermeiro', 1),
    ('Rafael Santos Alves',    'médico',     2),
    ('Fernanda Oliveira',      'médico',     2),
    ('Juliana Costa',          'enfermeiro', 2),
    ('Bruno Henrique Dias',    'enfermeiro', 2),
    ('Marcelo Teixeira',       'médico',     3),
    ('Camila Rodrigues',       'médico',     3),
    ('Larissa Martins',        'enfermeiro', 3),
    ('Beatriz Fernandes',      'médico',     4),
    ('Thiago Pereira',         'médico',     4),
    ('Gabriela Nunes',         'enfermeiro', 4),
    ('Eduardo Carvalho',       'médico',     5),
    ('Renata Almeida',         'enfermeiro', 5);

-- ----------------------------------------------------------------------------
-- Pacientes (30) — idade e gênero gerados aleatoriamente
-- ----------------------------------------------------------------------------
INSERT INTO patients (name, birth_date, gender, document)
SELECT
    nome,
    (DATE '1945-01-01' + (random() * 27000)::int)                AS birth_date,
    CASE WHEN random() < 0.5 THEN 'M' ELSE 'F' END                AS gender,
    'PAC-' || LPAD(ordinality::text, 4, '0')                      AS document
FROM unnest(ARRAY[
    'João Pedro Nascimento', 'Maria Clara Souza', 'Pedro Henrique Lima',
    'Ana Luiza Ferreira', 'Lucas Gabriel Rocha', 'Beatriz Almeida Santos',
    'Gustavo Henrique Costa', 'Isabela Cristina Melo', 'Matheus Oliveira Dias',
    'Larissa Fernandes Silva', 'Rafael Augusto Barbosa', 'Camila Vitória Ramos',
    'Felipe Augusto Carvalho', 'Letícia Moreira Pinto', 'Daniel Henrique Araújo',
    'Sophia Beatriz Cardoso', 'Vinícius Gabriel Teixeira', 'Manuela Vitória Gomes',
    'Gabriel Eduardo Martins', 'Alice Cristina Barros', 'Enzo Miguel Ribeiro',
    'Valentina Souza Pereira', 'Arthur Nicolas Correia', 'Helena Beatriz Nunes',
    'Davi Lucca Monteiro', 'Laura Cecília Freitas', 'Bernardo Luiz Castro',
    'Yasmin Rafaela Lopes', 'Theo Benício Moraes', 'Lívia Manuela Duarte'
]) WITH ORDINALITY AS t(nome, ordinality);

-- ----------------------------------------------------------------------------
-- Internações (40) — paciente, departamento, leito e equipe sorteados
-- ----------------------------------------------------------------------------
WITH dept_pick AS (
    SELECT
        g.seq                               AS adm_seq,
        d.id                                 AS department_id,
        d.total_beds                         AS total_beds
    FROM generate_series(1, 40) AS g(seq)
    CROSS JOIN LATERAL (
        SELECT id, total_beds FROM departments ORDER BY random() LIMIT 1
    ) AS d
),
staff_pick AS (
    SELECT
        dp.adm_seq,
        dp.department_id,
        dp.total_beds,
        s.id AS staff_id
    FROM dept_pick dp
    CROSS JOIN LATERAL (
        SELECT id FROM staff WHERE department_id = dp.department_id ORDER BY random() LIMIT 1
    ) AS s
),
details AS (
    SELECT
        sp.adm_seq,
        sp.department_id,
        sp.staff_id,
        (floor(random() * sp.total_beds) + 1)::int AS bed_number,
        NOW() - make_interval(days => (floor(random() * 60))::int, hours => (floor(random() * 24))::int) AS admission_date,
        (ARRAY['internado', 'alta', 'alta', 'alta', 'alta', 'alta', 'obito'])[(floor(random() * 7) + 1)::int] AS status,
        (ARRAY[
            'Pneumonia', 'Infarto agudo do miocárdio', 'Fratura de fêmur',
            'Apendicite aguda', 'AVC isquêmico', 'Insuficiência renal aguda',
            'Covid-19', 'Bronquiolite', 'Dengue', 'Sepse',
            'Pós-operatório', 'Hipertensão descompensada', 'Diabetes descompensada',
            'Dor abdominal a esclarecer'
        ])[(floor(random() * 14) + 1)::int] AS diagnosis,
        (floor(random() * 30) + 1)::int AS patient_id
    FROM staff_pick sp
)
INSERT INTO admissions (patient_id, department_id, attending_staff_id, bed_number, admission_date, discharge_date, status, diagnosis)
SELECT
    patient_id,
    department_id,
    staff_id,
    bed_number,
    admission_date,
    CASE WHEN status = 'internado' THEN NULL
         ELSE admission_date + make_interval(days => (floor(random() * 9) + 1)::int, hours => (floor(random() * 24))::int)
    END AS discharge_date,
    status,
    diagnosis
FROM details;

-- ----------------------------------------------------------------------------
-- Exames (1 a 3 por internação)
-- ----------------------------------------------------------------------------
INSERT INTO exams (admission_id, exam_type, requested_at, status, result_at, result_value)
SELECT
    a.id,
    (ARRAY[
        'Hemograma completo', 'Raio-X de tórax', 'Tomografia computadorizada',
        'Ressonância magnética', 'Glicemia', 'Eletrocardiograma',
        'Exame de urina', 'Gasometria arterial', 'PCR (proteína C reativa)',
        'Ureia e creatinina'
    ])[(floor(random() * 10) + 1)::int]                                            AS exam_type,
    req.requested_at,
    ex.status,
    CASE WHEN ex.status = 'concluido'
         THEN req.requested_at + make_interval(hours => (floor(random() * 12) + 1)::int)
         ELSE NULL
    END                                                                             AS result_at,
    CASE WHEN ex.status = 'concluido'
         THEN (ARRAY['Normal', 'Alterado', 'Dentro da referência', 'Levemente alterado', 'Requer acompanhamento'])[(floor(random() * 5) + 1)::int]
         ELSE NULL
    END                                                                             AS result_value
FROM admissions a
CROSS JOIN LATERAL generate_series(1, (floor(random() * 3) + 1)::int) AS n(seq)
CROSS JOIN LATERAL (
    SELECT a.admission_date + make_interval(hours => (floor(random() * 48))::int) AS requested_at
) AS req
CROSS JOIN LATERAL (
    SELECT (ARRAY['concluido', 'concluido', 'concluido', 'em_andamento', 'solicitado'])[(floor(random() * 5) + 1)::int] AS status
) AS ex;

-- ----------------------------------------------------------------------------
-- Sinais vitais (série temporal por internação, a cada ~6 horas)
-- ----------------------------------------------------------------------------
INSERT INTO vital_signs (admission_id, measured_at, heart_rate, systolic_pressure, diastolic_pressure, temperature, oxygen_saturation)
SELECT
    a.id,
    a.admission_date + make_interval(hours => (gs.n * 6)),
    (60 + floor(random() * 50))::int                       AS heart_rate,
    (100 + floor(random() * 50))::int                      AS systolic_pressure,
    (60 + floor(random() * 30))::int                       AS diastolic_pressure,
    round((35.5 + random() * 3)::numeric, 1)               AS temperature,
    (90 + floor(random() * 10))::int                       AS oxygen_saturation
FROM admissions a
CROSS JOIN LATERAL generate_series(0, (floor(random() * 8) + 2)::int) AS gs(n)
WHERE a.status = 'internado' OR random() < 0.7;
