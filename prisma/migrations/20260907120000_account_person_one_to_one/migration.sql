-- Person 1:1 Account; Account puede tener N roles (AccountRole ya lo permite).
-- Limpia duplicados de userId/username antes de índices únicos.

-- Si una persona tiene varias cuentas, deja la más reciente (id mayor) y desactiva el resto.
UPDATE Account a
INNER JOIN (
  SELECT userId, MAX(id) AS keepId
  FROM Account
  WHERE userId IS NOT NULL
  GROUP BY userId
  HAVING COUNT(*) > 1
) d ON a.userId = d.userId AND a.id <> d.keepId
SET a.userId = NULL, a.isActive = 0;

-- Usernames duplicados: renombra los más viejos
UPDATE Account a
INNER JOIN (
  SELECT username, MAX(id) AS keepId
  FROM Account
  WHERE username IS NOT NULL AND username <> ''
  GROUP BY username
  HAVING COUNT(*) > 1
) d ON a.username = d.username AND a.id <> d.keepId
SET a.username = CONCAT(a.username, '_old_', a.id);

-- Índices únicos
CREATE UNIQUE INDEX `Account_username_key` ON `Account`(`username`);
CREATE UNIQUE INDEX `Account_userId_key` ON `Account`(`userId`);
