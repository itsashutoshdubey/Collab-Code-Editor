# bookworm - version of Debian - stable and secure version
FROM gcc:14-bookworm

# Creating a restricted user named sandboxuser 
# -m to crete a home directory
RUN useradd -m sandboxuser

# creating app folder in working directory
WORKDIR /app

# chown - change owner
#  giving 'sandboxuser' full control over the /app folder
RUN chown sandboxuser:sandboxuser /app

USER sandboxuser



