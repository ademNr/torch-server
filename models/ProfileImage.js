module.exports = (sequelize, DataTypes) => {
    const ProfileImage = sequelize.define('ProfileImage', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        url: DataTypes.STRING,
        signature: DataTypes.JSONB
    }, {
        timestamps: false
    });

    return ProfileImage;
};