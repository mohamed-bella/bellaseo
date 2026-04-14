const supabase = require('../../config/database');

const getSettings = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('system_settings').select('*');
    if (error) throw error;
    
    // Convert array of {key, value} to a single object
    const settings = data.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
    
    res.json(settings);
  } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    
    const { data, error } = await supabase
      .from('system_settings')
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

module.exports = { getSettings, updateSettings };
