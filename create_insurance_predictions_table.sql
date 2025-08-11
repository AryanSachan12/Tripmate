-- Create travel insurance predictions table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS user_insurance_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  age FLOAT NOT NULL,
  graduate_or_not INTEGER NOT NULL CHECK (graduate_or_not IN (0, 1)),
  annual_income FLOAT NOT NULL,
  family_members FLOAT NOT NULL,
  frequent_flyer INTEGER NOT NULL CHECK (frequent_flyer IN (0, 1)),
  ever_travelled_abroad INTEGER NOT NULL CHECK (ever_travelled_abroad IN (0, 1)),
  prediction INTEGER NOT NULL CHECK (prediction IN (0, 1)),
  probability FLOAT CHECK (probability >= 0 AND probability <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- Only one prediction per user
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_insurance_predictions_user_id ON user_insurance_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_insurance_predictions_prediction ON user_insurance_predictions(prediction);
CREATE INDEX IF NOT EXISTS idx_user_insurance_predictions_created_at ON user_insurance_predictions(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_insurance_predictions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admin read access" ON user_insurance_predictions;
DROP POLICY IF EXISTS "Allow admin write access" ON user_insurance_predictions;

-- Allow admins to read all predictions
CREATE POLICY "Allow admin read access" ON user_insurance_predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- Allow admins to insert/update predictions
CREATE POLICY "Allow admin write access" ON user_insurance_predictions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_user_insurance_predictions_updated_at ON user_insurance_predictions;
CREATE TRIGGER update_user_insurance_predictions_updated_at 
  BEFORE UPDATE ON user_insurance_predictions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
GRANT ALL ON user_insurance_predictions TO authenticated;
GRANT ALL ON user_insurance_predictions TO service_role;
