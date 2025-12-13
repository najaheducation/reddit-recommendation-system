-- =========================
-- Seed data
-- =========================
/*
INSERT INTO public.users (id, username, email, password)
VALUES (1, 'mohammad', 'mohammad@example.com', 'hashed_password')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_interests (user_id, interest, weight) VALUES
                                                                  (1, 'gaming', 0.9),
                                                                  (1, 'vr', 0.8),
                                                                  (1, 'pc', 0.7),
                                                                  (1, 'phone', 0.6),
                                                                  (1, 'ai', 0.9),
                                                                  (1, 'spark', 0.8),
                                                                  (1, 'kafka', 0.7),
                                                                  (1, 'trading', 0.5),
                                                                  (1, 'ecommerce', 0.6)
ON CONFLICT DO NOTHING;
*/