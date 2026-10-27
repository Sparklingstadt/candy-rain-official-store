-- 大文字・小文字だけが違うメールアドレスが既にある場合は、インデックスを作れないため止める。
-- メールアドレス自体は出力せず、重複しているグループの件数だけを示す。
DO $$
DECLARE
  duplicate_groups integer;
BEGIN
  SELECT count(*) INTO duplicate_groups
  FROM (
    SELECT lower("email")
    FROM "User"
    GROUP BY lower("email")
    HAVING count(*) > 1
  ) AS duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION 'User.email に大文字・小文字を区別しない重複が % 組あります。重複を解消してからこのマイグレーションを適用してください', duplicate_groups;
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));
